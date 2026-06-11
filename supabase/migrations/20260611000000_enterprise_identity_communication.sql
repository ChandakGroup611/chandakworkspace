-- Migration: Enterprise Identity & Communication Center Framework
-- Description: Creates schema for Identity Providers, Dynamic Email Templates, Notification Rules, and Async Queue

-- 1. Identity Provider Configuration (Microsoft Entra ID)
CREATE TABLE IF NOT EXISTS public.identity_provider_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'AZURE_AD'
    tenant_id VARCHAR(255),
    client_id VARCHAR(255),
    client_secret_encrypted TEXT,
    authority_url VARCHAR(255),
    allowed_domains JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT false,
    force_sso BOOLEAN DEFAULT false,
    auto_provision_users BOOLEAN DEFAULT false,
    auto_assign_department UUID REFERENCES public.departments(id),
    auto_assign_role UUID REFERENCES public.roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Multi-Provider Email Routing
CREATE TABLE IF NOT EXISTS public.email_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL, -- 'Microsoft 365', 'SMTP', 'Resend', 'SendGrid'
    priority_level INT DEFAULT 1, -- 1=Primary, 2=Fallback1, etc.
    is_active BOOLEAN DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store host, port, encrypted password, api keys
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Dynamic Template Designer
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,
    event VARCHAR(50) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(module, event)
);

-- 4. Notification Rule Engine
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,
    event VARCHAR(50) NOT NULL,
    status_trigger VARCHAR(50),
    recipient_type JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['Creator', 'Executors', 'Department Admin']
    delivery_method JSONB NOT NULL DEFAULT '["EMAIL"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Async Email Queue (For Performance)
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50),
    event VARCHAR(50),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_user_id UUID REFERENCES public.user_master(id),
    subject VARCHAR(255) NOT NULL,
    html_body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    retry_count INT DEFAULT 0,
    provider_used UUID REFERENCES public.email_providers(id),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Delivery Tracking Logs
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES public.email_queue(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    status VARCHAR(50), -- DELIVERED, BOUNCED, OPENED, CLICKED
    provider_id UUID REFERENCES public.email_providers(id),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Audit Logging
CREATE TABLE IF NOT EXISTS public.communication_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES public.user_master(id),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.identity_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for Super Admins
CREATE POLICY policy_identity_provider_select ON public.identity_provider_config FOR SELECT TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_VIEW'));
CREATE POLICY policy_identity_provider_modify ON public.identity_provider_config FOR ALL TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_MANAGE'));

CREATE POLICY policy_email_providers_select ON public.email_providers FOR SELECT TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_VIEW'));
CREATE POLICY policy_email_providers_modify ON public.email_providers FOR ALL TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_MANAGE'));

CREATE POLICY policy_email_templates_select ON public.email_templates FOR SELECT TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_VIEW'));
CREATE POLICY policy_email_templates_modify ON public.email_templates FOR ALL TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_MANAGE'));

CREATE POLICY policy_notification_rules_select ON public.notification_rules FOR SELECT TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_VIEW'));
CREATE POLICY policy_notification_rules_modify ON public.notification_rules FOR ALL TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_MANAGE'));

CREATE POLICY policy_email_queue_select ON public.email_queue FOR SELECT TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_VIEW'));
CREATE POLICY policy_email_queue_modify ON public.email_queue FOR ALL TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_MANAGE'));

CREATE POLICY policy_delivery_logs_select ON public.email_delivery_logs FOR SELECT TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_VIEW'));
CREATE POLICY policy_audit_logs_select ON public.communication_audit_logs FOR SELECT TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_VIEW'));
