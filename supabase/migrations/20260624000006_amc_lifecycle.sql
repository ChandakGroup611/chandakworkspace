-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC Lifecycle (License Allocations & Expiry Alerts)
-- ============================================================================

-- 1. Create License Allocations Table
CREATE TABLE IF NOT EXISTS public.amc_license_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES public.software_amc(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    allocated_by UUID NOT NULL REFERENCES public.user_master(id),
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Revoked')),
    revoked_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- RLS for amc_license_allocations
ALTER TABLE public.amc_license_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view allocations for AMCs they own or admin" ON public.amc_license_allocations
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_license_allocations.amc_id 
            AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

CREATE POLICY "Admins and AMC owners can insert/update allocations" ON public.amc_license_allocations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_license_allocations.amc_id 
            AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

-- 2. Trigger to sync used_licenses
CREATE OR REPLACE FUNCTION public.sync_amc_used_licenses()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'Active' THEN
        UPDATE public.software_amc 
        SET used_licenses = COALESCE(used_licenses, 0) + 1
        WHERE id = NEW.amc_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'Active' AND NEW.status = 'Revoked' THEN
            UPDATE public.software_amc 
            SET used_licenses = GREATEST(COALESCE(used_licenses, 0) - 1, 0)
            WHERE id = NEW.amc_id;
        ELSIF OLD.status = 'Revoked' AND NEW.status = 'Active' THEN
            UPDATE public.software_amc 
            SET used_licenses = COALESCE(used_licenses, 0) + 1
            WHERE id = NEW.amc_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'Active' THEN
        UPDATE public.software_amc 
        SET used_licenses = GREATEST(COALESCE(used_licenses, 0) - 1, 0)
        WHERE id = OLD.amc_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_amc_used_licenses ON public.amc_license_allocations;
CREATE TRIGGER trigger_sync_amc_used_licenses
AFTER INSERT OR UPDATE OR DELETE ON public.amc_license_allocations
FOR EACH ROW EXECUTE FUNCTION public.sync_amc_used_licenses();

-- 3. Alert Logic (Cron Job target)
CREATE OR REPLACE FUNCTION public.check_amc_expirations()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT id, provider_name, software_name, expiry_date, assigned_to, notify_before_days
        FROM public.software_amc
        WHERE status = 'Active' 
        AND expiry_date IS NOT NULL
        AND notify_before_days IS NOT NULL
        AND (expiry_date - INTERVAL '1 day' * notify_before_days)::DATE = CURRENT_DATE
    LOOP
        -- Insert into event_queue to be picked up by the notification engine
        INSERT INTO public.event_queue (event_type, payload, status)
        VALUES (
            'AMC_EXPIRATION_ALERT',
            jsonb_build_object(
                'amc_id', rec.id,
                'software_name', rec.software_name,
                'provider_name', rec.provider_name,
                'expiry_date', rec.expiry_date,
                'assigned_to', rec.assigned_to,
                'days_remaining', rec.notify_before_days
            ),
            'PENDING'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The cron job execution must be scheduled via pg_cron extension, e.g.:
-- SELECT cron.schedule('amc_expiry_check', '0 8 * * *', 'SELECT public.check_amc_expirations()');

-- End of Script
