-- ==============================================================================
-- Security Hardening Migration: Revoke Direct Client Access to Credential Tables
-- Target Tables: public.email_providers, public.system_email_config
-- Purpose: Prevents PostgREST client queries (via browser console) from reading
--          or dumping plaintext SMTP credentials and API keys.
-- Enforces: Only backend Node.js Server Actions using service_role can access.
-- ==============================================================================

-- 1. Lock down public.email_providers
ALTER TABLE IF EXISTS public.email_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_email_providers_select ON public.email_providers;
DROP POLICY IF EXISTS policy_email_providers_modify ON public.email_providers;
DROP POLICY IF EXISTS policy_email_providers_service_only ON public.email_providers;

-- Restrict email_providers exclusively to service_role (Node.js backend)
CREATE POLICY policy_email_providers_service_only 
    ON public.email_providers 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 2. Lock down public.system_email_config
ALTER TABLE IF EXISTS public.system_email_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_system_email_config_all ON public.system_email_config;
DROP POLICY IF EXISTS policy_system_email_config_select ON public.system_email_config;
DROP POLICY IF EXISTS policy_system_email_config_service_only ON public.system_email_config;

-- Restrict system_email_config exclusively to service_role (Node.js backend)
CREATE POLICY policy_system_email_config_service_only 
    ON public.system_email_config 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);
