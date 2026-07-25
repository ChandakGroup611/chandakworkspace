-- 1. Create Industry Types Table
CREATE TABLE IF NOT EXISTS public.master_industry_types (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Vendor Types Table (with Industry dependency)
CREATE TABLE IF NOT EXISTS public.master_vendor_types (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    industry_name TEXT NOT NULL REFERENCES public.master_industry_types(name) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(name, industry_name)
);

-- 3. Enable RLS
ALTER TABLE public.master_industry_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_vendor_types ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
CREATE POLICY "Allow authenticated read access for industry types" ON public.master_industry_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access for industry types" ON public.master_industry_types FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read access for vendor types" ON public.master_vendor_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access for vendor types" ON public.master_vendor_types FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. (Skipped triggers to avoid moddatetime extension dependency)

-- 6. Seed Initial Industry Types
INSERT INTO public.master_industry_types (name, is_active) VALUES
    ('IT Software', true),
    ('IT Hardware / Electronics', true),
    ('Manufacturing', true),
    ('BFSI (Banking, Financial Services, Insurance)', true),
    ('Retail & E-Commerce', true),
    ('Healthcare & Pharma', true),
    ('Telecommunications', true),
    ('Education & EdTech', true),
    ('Construction & Real Estate', true),
    ('Logistics & Supply Chain', true),
    ('Government & PSU', true),
    ('Other', true)
ON CONFLICT (name) DO NOTHING;

-- 7. Seed Initial Vendor Types mapped to IT Software (as a generic default since we don't know the exact matrix before)
INSERT INTO public.master_vendor_types (name, industry_name, is_active) VALUES
    ('OEM (Original Equipment Manufacturer)', 'IT Hardware / Electronics', true),
    ('OEM (Original Equipment Manufacturer)', 'IT Software', true),
    ('Authorized Distributor', 'IT Hardware / Electronics', true),
    ('Value Added Reseller (VAR)', 'IT Software', true),
    ('System Integrator (SI)', 'IT Hardware / Electronics', true),
    ('System Integrator (SI)', 'IT Software', true),
    ('Managed Service Provider (MSP)', 'IT Software', true),
    ('Implementation Partner', 'IT Software', true),
    ('Consultant / Advisory', 'IT Software', true),
    ('Consultant / Advisory', 'Other', true),
    ('Direct Retailer', 'Retail & E-Commerce', true),
    ('Other', 'Other', true)
ON CONFLICT (name, industry_name) DO NOTHING;
