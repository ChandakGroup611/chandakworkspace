-- ==============================================================================
-- Migration: Fleet Insurance Vendor Master & Vehicle Integration
-- ==============================================================================

-- 1. Create Insurance Vendors Master Table
CREATE TABLE IF NOT EXISTS public.fleet_insurance_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    toll_free_number TEXT,
    claim_portal_url TEXT,
    website TEXT,
    address TEXT,
    gst_number TEXT,
    policy_types_offered TEXT[] DEFAULT '{"Comprehensive", "Zero Depreciation", "Third-Party Liability"}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fleet_insurance_vendors_name ON public.fleet_insurance_vendors(name);
CREATE INDEX IF NOT EXISTS idx_fleet_insurance_vendors_code ON public.fleet_insurance_vendors(code);
CREATE INDEX IF NOT EXISTS idx_fleet_insurance_vendors_active ON public.fleet_insurance_vendors(is_active);

-- Enable RLS
ALTER TABLE public.fleet_insurance_vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated to view insurance vendors" ON public.fleet_insurance_vendors;
CREATE POLICY "Allow authenticated to view insurance vendors"
ON public.fleet_insurance_vendors
FOR SELECT
TO authenticated
USING (is_deleted = false);

DROP POLICY IF EXISTS "Allow admins and fleet managers to manage insurance vendors" ON public.fleet_insurance_vendors;
CREATE POLICY "Allow admins and fleet managers to manage insurance vendors"
ON public.fleet_insurance_vendors
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.fleet_user_access fua
        WHERE fua.user_id = auth.uid() AND (fua.fleet_role IN ('FLEET_ADMIN', 'FLEET_DISPATCHER') OR fua.can_manage_settings = true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.fleet_user_access fua
        WHERE fua.user_id = auth.uid() AND (fua.fleet_role IN ('FLEET_ADMIN', 'FLEET_DISPATCHER') OR fua.can_manage_settings = true)
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_insurance_vendors TO authenticated;

-- 2. Add columns to vehicles table
ALTER TABLE public.vehicles
    ADD COLUMN IF NOT EXISTS insurance_vendor_id UUID REFERENCES public.fleet_insurance_vendors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS insurance_vendor TEXT;

-- 3. Seed Standard Indian Insurance Providers
INSERT INTO public.fleet_insurance_vendors (name, code, toll_free_number, website, claim_portal_url, display_order, is_active)
VALUES
  ('ICICI Lombard General Insurance', 'ICICI_LOMBARD', '1800-2666', 'https://www.icicilombard.com', 'https://www.icicilombard.com/claims', 1, true),
  ('Tata AIG General Insurance', 'TATA_AIG', '1800-266-7780', 'https://www.tataaig.com', 'https://www.tataaig.com/claims', 2, true),
  ('HDFC ERGO General Insurance', 'HDFC_ERGO', '1800-2666-400', 'https://www.hdfcergo.com', 'https://www.hdfcergo.com/claims', 3, true),
  ('Bajaj Allianz General Insurance', 'BAJAJ_ALLIANZ', '1800-209-5858', 'https://www.bajajallianz.com', 'https://www.bajajallianz.com/claims', 4, true),
  ('The New India Assurance Co. Ltd.', 'NEW_INDIA', '1800-209-1415', 'https://www.newindia.co.in', 'https://www.newindia.co.in/portal/claim', 5, true),
  ('National Insurance Company', 'NATIONAL_INS', '1800-345-0330', 'https://nationalinsurance.nic.co.in', 'https://nationalinsurance.nic.co.in/claims', 6, true),
  ('United India Insurance Co. Ltd.', 'UNITED_INDIA', '1800-425-33333', 'https://uiic.co.in', 'https://uiic.co.in/claims', 7, true),
  ('The Oriental Insurance Company', 'ORIENTAL_INS', '1800-118-485', 'https://orientalinsurance.org.in', 'https://orientalinsurance.org.in/claims', 8, true),
  ('Go Digit General Insurance', 'GODIGIT', '1800-258-5956', 'https://www.godigit.com', 'https://www.godigit.com/claims', 9, true),
  ('Acko General Insurance', 'ACKO', '1800-266-2256', 'https://www.acko.com', 'https://www.acko.com/claims', 10, true),
  ('SBI General Insurance', 'SBI_GENERAL', '1800-102-1111', 'https://www.sbigeneral.in', 'https://www.sbigeneral.in/claims', 11, true),
  ('Reliance General Insurance', 'RELIANCE_GEN', '1800-3009', 'https://www.reliancegeneral.co.in', 'https://www.reliancegeneral.co.in/claims', 12, true),
  ('Royal Sundaram General Insurance', 'ROYAL_SUNDARAM', '1860-425-0000', 'https://www.royalsundaram.in', 'https://www.royalsundaram.in/claims', 13, true),
  ('Future Generali India Insurance', 'FUTURE_GENERALI', '1800-220-233', 'https://general.futuregenerali.in', 'https://general.futuregenerali.in/claims', 14, true),
  ('Cholamandalam MS General Insurance', 'CHOLA_MS', '1800-208-5544', 'https://www.cholainsurance.com', 'https://www.cholainsurance.com/claims', 15, true),
  ('Universal Sompo General Insurance', 'UNIVERSAL_SOMPO', '1800-224-030', 'https://www.universalsompo.com', 'https://www.universalsompo.com/claims', 16, true)
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  toll_free_number = EXCLUDED.toll_free_number,
  website = EXCLUDED.website,
  claim_portal_url = EXCLUDED.claim_portal_url,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- 4. Backfill existing vehicles with matching insurance vendors
UPDATE public.vehicles v
SET 
  insurance_vendor_id = iv.id,
  insurance_vendor = iv.name
FROM public.fleet_insurance_vendors iv
WHERE v.insurance_vendor_id IS NULL
  AND (
    (v.insurance_policy_number ILIKE '%ICICI%' AND iv.code = 'ICICI_LOMBARD')
    OR (v.insurance_policy_number ILIKE '%Tata%' AND iv.code = 'TATA_AIG')
    OR (v.insurance_policy_number ILIKE '%HDFC%' AND iv.code = 'HDFC_ERGO')
    OR (v.insurance_policy_number ILIKE '%Bajaj%' AND iv.code = 'BAJAJ_ALLIANZ')
    OR (v.insurance_policy_number ILIKE '%New India%' AND iv.code = 'NEW_INDIA')
    OR (v.insurance_policy_number ILIKE '%Digit%' AND iv.code = 'GODIGIT')
    OR (v.insurance_policy_number ILIKE '%Acko%' AND iv.code = 'ACKO')
  );
