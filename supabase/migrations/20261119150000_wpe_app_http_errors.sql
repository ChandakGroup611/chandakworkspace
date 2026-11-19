-- WP-E: HTTP ERRORS (403/404/405) PERMANENT FIX
-- E1: app_http_errors table

CREATE TABLE IF NOT EXISTS public.app_http_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status INT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    module TEXT,
    referrer TEXT,
    build_commit TEXT,
    source TEXT NOT NULL CHECK (source IN ('app', 'server-firewall', 'storage')),
    error_message TEXT,
    error_stack TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_http_errors_created_status ON public.app_http_errors(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_app_http_errors_path ON public.app_http_errors(path);
CREATE INDEX IF NOT EXISTS idx_app_http_errors_source ON public.app_http_errors(source);
CREATE INDEX IF NOT EXISTS idx_app_http_errors_module ON public.app_http_errors(module);

ALTER TABLE public.app_http_errors ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access to app_http_errors" ON public.app_http_errors;
CREATE POLICY "Allow service role full access to app_http_errors"
ON public.app_http_errors
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert error logs
DROP POLICY IF EXISTS "Allow authenticated users to insert app_http_errors" ON public.app_http_errors;
CREATE POLICY "Allow authenticated users to insert app_http_errors"
ON public.app_http_errors
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anon to insert error logs (e.g. unauthenticated /login failures)
DROP POLICY IF EXISTS "Allow anon to insert app_http_errors" ON public.app_http_errors;
CREATE POLICY "Allow anon to insert app_http_errors"
ON public.app_http_errors
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow users to read app_http_errors: their own errors, or Super Admin
DROP POLICY IF EXISTS "Allow users to read app_http_errors" ON public.app_http_errors;
CREATE POLICY "Allow users to read app_http_errors"
ON public.app_http_errors
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON r.id = um.role_id
        WHERE um.id = auth.uid() AND r.code = 'SUPER_ADMIN'
    )
);
