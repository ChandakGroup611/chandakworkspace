-- Create master_contract_types table
CREATE TABLE IF NOT EXISTS public.master_contract_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.master_contract_types ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to authenticated users on master_contract_types"
    ON public.master_contract_types FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow insert/update access to authenticated users (or restrict as needed)
CREATE POLICY "Allow insert access to authenticated users on master_contract_types"
    ON public.master_contract_types FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Seed initial data
INSERT INTO public.master_contract_types (name)
VALUES 
    ('AMC'), 
    ('Subscription'), 
    ('Perpetual License'), 
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- Drop the hardcoded check constraint on software_amc
DO $$ 
DECLARE 
    const_name text;
BEGIN 
    SELECT constraint_name INTO const_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'software_amc' AND constraint_type = 'CHECK' AND constraint_name LIKE '%contract_type%';
    
    IF const_name IS NOT NULL THEN 
        EXECUTE 'ALTER TABLE public.software_amc DROP CONSTRAINT ' || const_name;
    END IF;
END $$;
