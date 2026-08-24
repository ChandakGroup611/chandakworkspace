-- Migration: AMC Enterprise Expansion (Compliance, Attachments, Multi-Currency)

-- 1. Compliance Fields for Master AMC
ALTER TABLE public.software_amc 
ADD COLUMN IF NOT EXISTS data_classification TEXT,
ADD COLUMN IF NOT EXISTS compliance_status TEXT[],
ADD COLUMN IF NOT EXISTS infosec_approved_date DATE,
ADD COLUMN IF NOT EXISTS dpa_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dpa_signed_date DATE;

-- 2. AMC Attachments Table
CREATE TABLE IF NOT EXISTS public.amc_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES public.software_amc(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL
);

-- Enable RLS for Attachments
ALTER TABLE public.amc_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage amc attachments" ON public.amc_attachments;
CREATE POLICY "Authenticated users can manage amc attachments" ON public.amc_attachments
    FOR ALL TO authenticated USING (true);


-- 3. Multi-Currency Tracking
ALTER TABLE public.amc_transactions
ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,4) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS base_currency_amount NUMERIC(15,2);

ALTER TABLE public.amc_renewals
ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,4) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS base_currency_amount NUMERIC(15,2);

ALTER TABLE public.amc_invoices
ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,4) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS base_currency_amount NUMERIC(15,2);
