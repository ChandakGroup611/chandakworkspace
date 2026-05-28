-- ============================================================================
-- ADIOS PLATFORM MIGRATION - TRUE HYPERSCALE NOTIFICATION ENGINE
-- ============================================================================

-- 1. IMMUTABLE DOMAIN EVENT BUS (LIGHTWEIGHT EVENT ROUTER)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID, -- For future multi-tenant SaaS isolation
    event_type TEXT NOT NULL,
    event_version TEXT NOT NULL DEFAULT 'v1',
    schema_version TEXT NOT NULL DEFAULT 'v1',
    entity_id UUID NOT NULL,
    actor_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    priority TEXT NOT NULL DEFAULT 'NORMAL', -- CRITICAL, HIGH, NORMAL, BULK, DIGEST
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Protect Immutability (No Updates)
CREATE OR REPLACE FUNCTION prevent_event_updates()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Updates to system_domain_events are strictly prohibited (Immutable Event Sourcing)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_event_updates ON public.system_domain_events;
CREATE TRIGGER tr_prevent_event_updates
BEFORE UPDATE ON public.system_domain_events
FOR EACH ROW EXECUTE FUNCTION prevent_event_updates();

-- 2. EVENT PROCESSING IDEMPOTENCY REGISTRY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_processing_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.system_domain_events(id) ON DELETE CASCADE,
    processor_name TEXT NOT NULL,
    processing_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- COMPLETED, FAILED, RETRYING
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, processor_name)
);

-- 3. GOVERNANCE SWITCHES & PREFERENCES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_governance_switches (
    tenant_id UUID PRIMARY KEY, -- Allow Global (NULL) or per-tenant switches
    disable_all_emails BOOLEAN DEFAULT false,
    disable_all_realtime BOOLEAN DEFAULT false,
    disable_digests BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.user_master(id) ON DELETE CASCADE,
    tenant_id UUID,
    muted_modules TEXT[] DEFAULT '{}',
    email_frequency TEXT DEFAULT 'INSTANT', -- INSTANT, DIGEST, NEVER
    digest_interval_hours INTEGER DEFAULT 24,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_event_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    module_code TEXT NOT NULL,
    event_code TEXT NOT NULL,
    is_email_enabled BOOLEAN DEFAULT true,
    is_inapp_enabled BOOLEAN DEFAULT true,
    allowed_roles TEXT[] DEFAULT '{}',
    allowed_statuses TEXT[] DEFAULT '{}',
    cooldown_seconds INTEGER DEFAULT 0,
    max_events_per_window INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(tenant_id, module_code, event_code)
);

-- 4. TENANT RESOURCE & PROVIDER GOVERNANCE (RATE LIMITING)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_delivery_limits (
    tenant_id UUID PRIMARY KEY,
    max_emails_per_hour INTEGER DEFAULT 500,
    burst_limit INTEGER DEFAULT 50,
    concurrent_jobs INTEGER DEFAULT 2,
    max_webhooks INTEGER DEFAULT 1000
);

CREATE TABLE IF NOT EXISTS public.provider_rate_limits (
    provider_type TEXT PRIMARY KEY,
    per_minute_limit INTEGER DEFAULT 100,
    hourly_limit INTEGER DEFAULT 500,
    concurrent_connections INTEGER DEFAULT 10,
    retry_policy JSONB DEFAULT '{"max_retries": 5, "backoff": "exponential"}'
);

-- 5. SYSTEM EMAIL & SECURE TEMPLATE ENGINES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_email_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    provider_type TEXT NOT NULL,
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_username TEXT,
    smtp_password_encrypted TEXT,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    encryption_type TEXT DEFAULT 'STARTTLS',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    template_code TEXT NOT NULL,
    module_code TEXT,
    template_version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, template_code, template_version)
);

CREATE TABLE IF NOT EXISTS public.configuration_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    actor_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    config_type TEXT NOT NULL, -- SMTP, TEMPLATE, POLICY
    action TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PRIORITY-BASED DISTRIBUTED DELIVERY QUEUES (SHARDS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_queue_critical (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    event_id UUID REFERENCES public.system_domain_events(id) ON DELETE SET NULL,
    channel TEXT NOT NULL, -- EMAIL, INAPP, WEBHOOK
    recipient_id UUID,
    recipient_email TEXT,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, DELIVERED, FAILED
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    provider_used TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.delivery_queue_normal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    event_id UUID REFERENCES public.system_domain_events(id) ON DELETE SET NULL,
    channel TEXT NOT NULL, 
    recipient_id UUID,
    recipient_email TEXT,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    provider_used TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.delivery_queue_digest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    event_id UUID REFERENCES public.system_domain_events(id) ON DELETE SET NULL,
    channel TEXT NOT NULL, 
    recipient_id UUID,
    recipient_email TEXT,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    provider_used TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    original_queue TEXT NOT NULL,
    queue_item_id UUID NOT NULL,
    event_id UUID,
    recipient_email TEXT,
    payload JSONB NOT NULL,
    failure_reason TEXT NOT NULL,
    failed_at TIMESTAMPTZ DEFAULT now()
);

-- 7. READ-MODEL OPTIMIZATIONS (UNREAD COUNTERS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_notification_summary (
    user_id UUID PRIMARY KEY REFERENCES public.user_master(id) ON DELETE CASCADE,
    total_unread INTEGER DEFAULT 0,
    critical_unread INTEGER DEFAULT 0,
    last_synced_at TIMESTAMPTZ DEFAULT now()
);

-- Index for Queue Polling
CREATE INDEX IF NOT EXISTS idx_delivery_queue_critical_status ON public.delivery_queue_critical(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_delivery_queue_normal_status ON public.delivery_queue_normal(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_delivery_queue_digest_status ON public.delivery_queue_digest(status) WHERE status = 'PENDING';

-- Index for Event Sourcing
CREATE INDEX IF NOT EXISTS idx_system_events_created ON public.system_domain_events(created_at DESC);
