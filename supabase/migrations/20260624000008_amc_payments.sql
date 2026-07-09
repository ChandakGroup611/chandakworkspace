-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC Invoices & Payment Schedules
-- ============================================================================

-- 1. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.amc_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES public.software_amc(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.amc_transactions(id) ON DELETE CASCADE,
    renewal_id UUID REFERENCES public.amc_renewals(id) ON DELETE CASCADE,
    invoice_number TEXT,
    description TEXT,
    amount NUMERIC(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Cancelled')),
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.user_master(id)
);

-- Enable RLS
ALTER TABLE public.amc_invoices ENABLE ROW LEVEL SECURITY;

-- Shared Policy for Invoices
CREATE POLICY "Users can view invoices for their AMCs or if Admin" ON public.amc_invoices
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_invoices.amc_id AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

CREATE POLICY "Admins and AMC owners can manage invoices" ON public.amc_invoices
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_invoices.amc_id AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );


-- 2. Trigger Function to Auto-Generate Invoices on AMC Creation
CREATE OR REPLACE FUNCTION public.auto_generate_amc_invoices()
RETURNS TRIGGER AS $$
DECLARE
    num_invoices INTEGER := 1;
    invoice_amount NUMERIC(15,2);
    interval_months INTEGER := 12;
    i INTEGER;
    current_due_date DATE;
BEGIN
    -- Only generate if there is a cost
    IF NEW.cost IS NULL OR NEW.cost <= 0 THEN
        RETURN NEW;
    END IF;

    -- Determine schedule based on payment terms
    IF NEW.payment_terms ILIKE '%Monthly%' THEN
        num_invoices := 12;
        interval_months := 1;
    ELSIF NEW.payment_terms ILIKE '%Quarterly%' THEN
        num_invoices := 4;
        interval_months := 3;
    ELSIF NEW.payment_terms ILIKE '%Bi-Annually%' OR NEW.payment_terms ILIKE '%Half-Yearly%' THEN
        num_invoices := 2;
        interval_months := 6;
    ELSE
        -- Default to 1 invoice (Annually, 100% Advance, Post-Payment, etc.)
        num_invoices := 1;
        interval_months := 12;
    END IF;

    invoice_amount := ROUND(NEW.cost / num_invoices, 2);
    current_due_date := NEW.purchase_date;

    FOR i IN 1..num_invoices LOOP
        INSERT INTO public.amc_invoices (
            amc_id, 
            description, 
            amount, 
            due_date, 
            status,
            created_by
        ) VALUES (
            NEW.id,
            'Auto-generated invoice ' || i || ' of ' || num_invoices || ' (' || NEW.payment_terms || ')',
            invoice_amount,
            current_due_date,
            'Pending',
            NEW.assigned_to -- inherit creator/assignee
        );
        
        -- Increment due date for next invoice
        current_due_date := current_due_date + (interval_months || ' months')::INTERVAL;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to software_amc
DROP TRIGGER IF EXISTS trigger_generate_invoices_on_amc ON public.software_amc;
CREATE TRIGGER trigger_generate_invoices_on_amc
AFTER INSERT ON public.software_amc
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_amc_invoices();


-- 3. Trigger Function to Auto-Generate Invoice on Transaction
CREATE OR REPLACE FUNCTION public.auto_generate_tx_invoices()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cost IS NOT NULL AND NEW.cost > 0 THEN
        INSERT INTO public.amc_invoices (
            amc_id,
            transaction_id,
            description,
            amount,
            due_date,
            status,
            created_by
        ) VALUES (
            NEW.amc_id,
            NEW.id,
            'Transaction: ' || NEW.transaction_type || COALESCE(' (PO: ' || NEW.po_number || ')', ''),
            NEW.cost,
            NEW.transaction_date,
            'Pending',
            NEW.created_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_generate_invoices_on_tx ON public.amc_transactions;
CREATE TRIGGER trigger_generate_invoices_on_tx
AFTER INSERT ON public.amc_transactions
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_tx_invoices();


-- 4. Trigger Function to Auto-Generate Invoice on Renewal
CREATE OR REPLACE FUNCTION public.auto_generate_renewal_invoices()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.renewal_cost IS NOT NULL AND NEW.renewal_cost > 0 THEN
        INSERT INTO public.amc_invoices (
            amc_id,
            renewal_id,
            description,
            amount,
            due_date,
            status,
            created_by
        ) VALUES (
            NEW.amc_id,
            NEW.id,
            'AMC Renewal' || COALESCE(' (PO: ' || NEW.po_number || ')', ''),
            NEW.renewal_cost,
            NEW.renewal_date,
            'Pending',
            NEW.created_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_generate_invoices_on_renewal ON public.amc_renewals;
CREATE TRIGGER trigger_generate_invoices_on_renewal
AFTER INSERT ON public.amc_renewals
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_renewal_invoices();

-- End of Script
