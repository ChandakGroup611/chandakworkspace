-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC Post-Purchase Tracking (Transactions & Renewals)
-- ============================================================================

-- 1. Create AMC Transactions Table (For Add-ons, Customizations, etc.)
CREATE TABLE IF NOT EXISTS public.amc_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES public.software_amc(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Add-on Licenses', 'Customization', 'Support Services', 'Other')),
    po_number TEXT,
    cost NUMERIC(15,2) DEFAULT 0,
    licenses_added INTEGER DEFAULT 0,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.user_master(id)
);

-- 2. Create AMC Renewals Table (For Yearly/Periodic Renewals)
CREATE TABLE IF NOT EXISTS public.amc_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES public.software_amc(id) ON DELETE CASCADE,
    po_number TEXT,
    renewal_cost NUMERIC(15,2) NOT NULL,
    previous_expiry DATE,
    new_expiry DATE NOT NULL,
    renewal_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.user_master(id)
);

-- 3. Row Level Security Policies
ALTER TABLE public.amc_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_renewals ENABLE ROW LEVEL SECURITY;

-- Shared Policy for Transactions
CREATE POLICY "Users can view transactions for their AMCs or if Admin" ON public.amc_transactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_transactions.amc_id AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

CREATE POLICY "Admins and AMC owners can insert transactions" ON public.amc_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_transactions.amc_id AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

-- Shared Policy for Renewals
CREATE POLICY "Users can view renewals for their AMCs or if Admin" ON public.amc_renewals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_renewals.amc_id AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

CREATE POLICY "Admins and AMC owners can insert renewals" ON public.amc_renewals
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_renewals.amc_id AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

-- 4. Triggers to Auto-Update Master Record
CREATE OR REPLACE FUNCTION public.sync_amc_transactions()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.licenses_added > 0 THEN
        UPDATE public.software_amc 
        SET total_licenses = COALESCE(total_licenses, 0) + NEW.licenses_added
        WHERE id = NEW.amc_id;
    ELSIF TG_OP = 'DELETE' AND OLD.licenses_added > 0 THEN
        UPDATE public.software_amc 
        SET total_licenses = GREATEST(COALESCE(total_licenses, 0) - OLD.licenses_added, 0)
        WHERE id = OLD.amc_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_amc_transactions ON public.amc_transactions;
CREATE TRIGGER trigger_sync_amc_transactions
AFTER INSERT OR DELETE ON public.amc_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_amc_transactions();


CREATE OR REPLACE FUNCTION public.sync_amc_renewals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.software_amc 
        SET expiry_date = NEW.new_expiry
        WHERE id = NEW.amc_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_amc_renewals ON public.amc_renewals;
CREATE TRIGGER trigger_sync_amc_renewals
AFTER INSERT ON public.amc_renewals
FOR EACH ROW EXECUTE FUNCTION public.sync_amc_renewals();

-- End of Script
