-- DMAC step 4: secure sharing with people outside the company.
--
-- A share is a link sent to one email address. The recipient proves who they are with a
-- one-time code sent to that address (and a password, when the sharer set one, which the
-- sharer passes on by phone or SMS). Rules enforced here:
--   * only someone with view + "email / share outside" rights on every document can share it,
--     plus download rights when the share allows downloads;
--   * only QC-approved, live documents can go out;
--   * the workspace share policy caps expiry, can forbid downloads, can require a password
--     and can block recipient domains;
--   * the sharer or a DMS administrator can revoke at any time;
--   * failed checks are counted atomically and lock the link at the policy limits.
-- Tokens, codes and passwords are hashed in the app with a server secret; only hashes are stored.

-- ---------- shares: columns the portal needs ----------
ALTER TABLE public.dms_shares ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.dms_shares ALTER COLUMN encrypted_envelope_key DROP NOT NULL;
ALTER TABLE public.dms_shares
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS max_downloads INT,
    ADD COLUMN IF NOT EXISTS download_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failed_email_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id);

DO $$ BEGIN
    ALTER TABLE public.dms_shares ADD CONSTRAINT chk_dms_share_max_downloads CHECK (max_downloads IS NULL OR max_downloads > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_dms_shares_workspace ON public.dms_shares (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dms_shares_creator ON public.dms_shares (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dms_share_items_share ON public.dms_share_items (share_id);
CREATE INDEX IF NOT EXISTS idx_dms_share_items_document ON public.dms_share_items (document_id);
CREATE INDEX IF NOT EXISTS idx_dms_share_otps_share ON public.dms_share_otps (share_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dms_share_attempts_share ON public.dms_share_access_attempts (share_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dms_share_devices_token ON public.dms_share_devices (session_token_hash);

-- ---------- workspace share policy ----------
CREATE TABLE IF NOT EXISTS public.dms_share_policy (
    workspace_id UUID PRIMARY KEY REFERENCES public.dms_workspaces(id) ON DELETE CASCADE,
    max_days INT NOT NULL DEFAULT 30 CHECK (max_days BETWEEN 1 AND 365),
    allow_download BOOLEAN NOT NULL DEFAULT true,
    require_password BOOLEAN NOT NULL DEFAULT false,
    blocked_domains TEXT[] NOT NULL DEFAULT '{}',
    max_items INT NOT NULL DEFAULT 50 CHECK (max_items BETWEEN 1 AND 500),
    wrong_email_limit INT NOT NULL DEFAULT 1 CHECK (wrong_email_limit BETWEEN 1 AND 10),
    failed_code_limit INT NOT NULL DEFAULT 5 CHECK (failed_code_limit BETWEEN 1 AND 20),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dms_share_policy ENABLE ROW LEVEL SECURITY;
-- No policies: only the server (service role) reads or writes share data.
ALTER TABLE public.dms_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dms_share_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dms_share_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dms_share_access_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dms_share_devices ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_dms_share_policy(p_workspace UUID)
RETURNS public.dms_share_policy LANGUAGE sql STABLE AS $$
    SELECT coalesce(
        (SELECT p FROM public.dms_share_policy p WHERE p.workspace_id = p_workspace),
        ROW(p_workspace, 30, true, false, '{}'::text[], 50, 1, 5, NULL::uuid, now())::public.dms_share_policy)
$$;

CREATE OR REPLACE FUNCTION public.fn_dms_set_share_policy(p_actor UUID, p_base JSONB, p_workspace UUID, p_policy JSONB)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_domains TEXT[];
BEGIN
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(p_base, 'admin'), 'Only a DMS administrator can change the share policy.');
    SELECT coalesce(array_agg(DISTINCT lower(trim(both '@ ' FROM d))) FILTER (WHERE trim(both '@ ' FROM d) <> ''), '{}')
    INTO v_domains FROM jsonb_array_elements_text(coalesce(p_policy -> 'blocked_domains', '[]'::jsonb)) AS d;

    INSERT INTO public.dms_share_policy AS sp (workspace_id, max_days, allow_download, require_password, blocked_domains,
                                               max_items, wrong_email_limit, failed_code_limit, updated_by, updated_at)
    VALUES (p_workspace,
            coalesce((p_policy ->> 'max_days')::int, 30),
            coalesce((p_policy ->> 'allow_download')::boolean, true),
            coalesce((p_policy ->> 'require_password')::boolean, false),
            v_domains,
            coalesce((p_policy ->> 'max_items')::int, 50),
            coalesce((p_policy ->> 'wrong_email_limit')::int, 1),
            coalesce((p_policy ->> 'failed_code_limit')::int, 5),
            p_actor, now())
    ON CONFLICT (workspace_id) DO UPDATE SET
        max_days = EXCLUDED.max_days, allow_download = EXCLUDED.allow_download,
        require_password = EXCLUDED.require_password, blocked_domains = EXCLUDED.blocked_domains,
        max_items = EXCLUDED.max_items, wrong_email_limit = EXCLUDED.wrong_email_limit,
        failed_code_limit = EXCLUDED.failed_code_limit, updated_by = EXCLUDED.updated_by, updated_at = now();

    PERFORM public.fn_dms_audit(p_actor, 'SHARE_POLICY_CHANGED', 'WORKSPACE', p_workspace, p_policy);
END $$;

-- ---------- create a share ----------
CREATE OR REPLACE FUNCTION public.fn_dms_create_share(
    p_actor UUID, p_base JSONB, p_workspace UUID, p_documents UUID[], p_email TEXT, p_phone TEXT,
    p_expires_at TIMESTAMPTZ, p_allow_download BOOLEAN, p_allow_print BOOLEAN, p_max_downloads INT,
    p_title TEXT, p_message TEXT, p_token_hash TEXT, p_password_hash TEXT)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    pol public.dms_share_policy;
    v_email TEXT := lower(trim(coalesce(p_email, '')));
    v_domain TEXT;
    v_docs UUID[];
    v_doc UUID;
    r jsonb;
    d RECORD;
    v_share UUID;
BEGIN
    pol := public.fn_dms_share_policy(p_workspace);
    SELECT coalesce(array_agg(DISTINCT x), '{}') INTO v_docs FROM unnest(coalesce(p_documents, '{}')) AS x WHERE x IS NOT NULL;

    PERFORM public.fn_dms_raise_unless(v_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$', 'Enter a valid email address for the recipient.');
    v_domain := split_part(v_email, '@', 2);
    PERFORM public.fn_dms_raise_unless(NOT (v_domain = ANY (pol.blocked_domains)),
        format('Sharing with %s addresses is blocked by the share policy.', v_domain));
    PERFORM public.fn_dms_raise_unless(cardinality(v_docs) > 0, 'Pick at least one document to share.');
    PERFORM public.fn_dms_raise_unless(cardinality(v_docs) <= pol.max_items,
        format('A share can hold at most %s documents.', pol.max_items));
    PERFORM public.fn_dms_raise_unless(p_expires_at > now(), 'The expiry must be in the future.');
    PERFORM public.fn_dms_raise_unless(p_expires_at <= now() + make_interval(days => pol.max_days) + interval '1 hour',
        format('The share policy allows links for at most %s days.', pol.max_days));
    PERFORM public.fn_dms_raise_unless(NOT coalesce(p_allow_download, false) OR pol.allow_download,
        'The share policy does not allow downloads. Share as view only.');
    PERFORM public.fn_dms_raise_unless(NOT pol.require_password OR coalesce(p_password_hash, '') <> '',
        'The share policy requires a password on every link.');
    PERFORM public.fn_dms_raise_unless(p_max_downloads IS NULL OR p_max_downloads > 0, 'The download limit must be at least 1.');
    PERFORM public.fn_dms_raise_unless(coalesce(length(p_token_hash), 0) = 64, 'Invalid link token.');

    FOREACH v_doc IN ARRAY v_docs LOOP
        SELECT id, title, workspace_id, approval_status, deleted_at INTO d FROM public.dms_documents WHERE id = v_doc;
        PERFORM public.fn_dms_raise_unless(FOUND AND d.deleted_at IS NULL AND d.workspace_id = p_workspace, 'A document in this share no longer exists.');
        r := public.fn_dms_document_rights(p_actor, v_doc, p_base);
        PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(r, 'view') AND public.fn_dms_flag(r, 'email'),
            format('You are not allowed to share "%s" outside the company.', d.title));
        PERFORM public.fn_dms_raise_unless(NOT coalesce(p_allow_download, false) OR public.fn_dms_flag(r, 'download'),
            format('You cannot allow downloads of "%s" because you cannot download it yourself.', d.title));
        PERFORM public.fn_dms_raise_unless(d.approval_status = 'APPROVED',
            format('"%s" has not passed QC yet, so it cannot be shared.', d.title));
    END LOOP;

    INSERT INTO public.dms_shares (workspace_id, token_hash, recipient_email, recipient_phone, password_hash,
                                   allow_view, allow_comment, allow_upload_revision, allow_print, allow_download,
                                   expires_at, max_downloads, title, message, created_by)
    VALUES (p_workspace, p_token_hash, v_email, nullif(trim(coalesce(p_phone, '')), ''), nullif(p_password_hash, ''),
            true, false, false, coalesce(p_allow_print, false), coalesce(p_allow_download, false),
            p_expires_at, CASE WHEN coalesce(p_allow_download, false) THEN p_max_downloads END,
            nullif(left(trim(coalesce(p_title, '')), 200), ''), nullif(left(trim(coalesce(p_message, '')), 2000), ''), p_actor)
    RETURNING id INTO v_share;

    INSERT INTO public.dms_share_items (share_id, document_id) SELECT v_share, x FROM unnest(v_docs) AS x;

    PERFORM public.fn_dms_audit(p_actor, 'SHARE_CREATED', 'SHARE', v_share, jsonb_build_object(
        'recipient', v_email, 'documents', to_jsonb(v_docs), 'expires_at', p_expires_at,
        'allow_download', coalesce(p_allow_download, false), 'max_downloads', p_max_downloads,
        'password', coalesce(p_password_hash, '') <> ''));
    RETURN v_share;
END $$;

-- ---------- revoke ----------
CREATE OR REPLACE FUNCTION public.fn_dms_revoke_share(p_actor UUID, p_base JSONB, p_share UUID, p_reason TEXT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    s RECORD;
BEGIN
    SELECT id, created_by, is_revoked INTO s FROM public.dms_shares WHERE id = p_share FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'Share not found.');
    PERFORM public.fn_dms_raise_unless(s.created_by IS NOT DISTINCT FROM p_actor OR public.fn_dms_flag(p_base, 'admin'),
        'Only the person who shared it or a DMS administrator can revoke this link.');
    IF s.is_revoked THEN RETURN; END IF;
    UPDATE public.dms_shares
    SET is_revoked = true, revoked_at = now(), revoked_by = p_actor,
        revoked_reason = coalesce(nullif(left(trim(coalesce(p_reason, '')), 500), ''), 'Revoked by sharer')
    WHERE id = p_share;
    -- End any open sessions straight away
    UPDATE public.dms_share_devices SET expires_at = now() WHERE share_id = p_share AND expires_at > now();
    PERFORM public.fn_dms_audit(p_actor, 'SHARE_REVOKED', 'SHARE', p_share, jsonb_build_object('reason', p_reason));
END $$;

-- ---------- counters used by the public portal (atomic, so parallel requests cannot dodge limits) ----------
-- p_kind: EMAIL, OTP or PASSWORD. Returns the new count and whether the link is now locked.
CREATE OR REPLACE FUNCTION public.fn_dms_share_register_failure(p_share UUID, p_kind TEXT)
RETURNS TABLE (failures INT, locked BOOLEAN) LANGUAGE plpgsql AS $$
DECLARE
    s RECORD;
    pol public.dms_share_policy;
    v_n INT;
    v_limit INT;
BEGIN
    SELECT * INTO s FROM public.dms_shares WHERE id = p_share FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;
    pol := public.fn_dms_share_policy(s.workspace_id);

    IF p_kind = 'EMAIL' THEN
        v_n := coalesce(s.failed_email_attempts, 0) + 1; v_limit := pol.wrong_email_limit;
        UPDATE public.dms_shares SET failed_email_attempts = v_n WHERE id = p_share;
    ELSIF p_kind = 'PASSWORD' THEN
        v_n := coalesce(s.failed_password_attempts, 0) + 1; v_limit := pol.failed_code_limit;
        UPDATE public.dms_shares SET failed_password_attempts = v_n WHERE id = p_share;
    ELSE
        v_n := coalesce(s.failed_otp_attempts, 0) + 1; v_limit := pol.failed_code_limit;
        UPDATE public.dms_shares SET failed_otp_attempts = v_n WHERE id = p_share;
    END IF;

    IF v_n >= v_limit AND NOT s.is_revoked THEN
        UPDATE public.dms_shares
        SET is_revoked = true, revoked_at = now(),
            revoked_reason = CASE p_kind WHEN 'EMAIL' THEN 'Locked: someone entered an email address that was not the recipient''s'
                                         WHEN 'PASSWORD' THEN 'Locked: too many wrong passwords'
                                         ELSE 'Locked: too many wrong codes' END
        WHERE id = p_share;
        UPDATE public.dms_share_otps SET is_used = true WHERE share_id = p_share AND NOT is_used;
        UPDATE public.dms_share_devices SET expires_at = now() WHERE share_id = p_share AND expires_at > now();
        PERFORM public.fn_dms_audit(NULL, 'SHARE_LOCKED', 'SHARE', p_share, jsonb_build_object('reason', p_kind, 'failures', v_n));
        RETURN QUERY SELECT v_n, true;
        RETURN;
    END IF;
    RETURN QUERY SELECT v_n, s.is_revoked;
END $$;

-- Count one view or download. Returns false when the link is no longer usable or the download limit is reached.
CREATE OR REPLACE FUNCTION public.fn_dms_share_count_access(p_share UUID, p_download BOOLEAN)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
    s RECORD;
BEGIN
    SELECT * INTO s FROM public.dms_shares WHERE id = p_share FOR UPDATE;
    IF NOT FOUND OR s.is_revoked OR s.expires_at <= now() THEN RETURN false; END IF;
    IF p_download THEN
        IF NOT s.allow_download THEN RETURN false; END IF;
        IF s.max_downloads IS NOT NULL AND s.download_count >= s.max_downloads THEN RETURN false; END IF;
        UPDATE public.dms_shares SET download_count = download_count + 1, last_access_at = now() WHERE id = p_share;
    ELSE
        UPDATE public.dms_shares SET view_count = view_count + 1, last_access_at = now() WHERE id = p_share;
    END IF;
    RETURN true;
END $$;

-- ---------- only the server (service role) may call these ----------
DO $$
DECLARE
    fn TEXT;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname LIKE 'fn\_dms\_%share%'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END LOOP;
END $$;
