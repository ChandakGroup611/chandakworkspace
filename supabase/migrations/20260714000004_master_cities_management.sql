-- Migration for City Management

-- 1. Add is_active column
ALTER TABLE public.master_cities
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- 2. Add UPDATE and DELETE policies
DROP POLICY IF EXISTS "Enable update access for all users" ON public.master_cities;
CREATE POLICY "Enable update access for all users" ON public.master_cities FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.master_cities;
CREATE POLICY "Enable delete access for all users" ON public.master_cities FOR DELETE USING (true);

-- 3. Create RPC to check if city is in use
CREATE OR REPLACE FUNCTION public.check_city_in_use(p_city_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check vendor_master (city)
    IF EXISTS (SELECT 1 FROM public.vendor_master WHERE city = p_city_name) THEN
        RETURN true;
    END IF;

    -- Check vendor_master (bank_city)
    IF EXISTS (SELECT 1 FROM public.vendor_master WHERE bank_city = p_city_name) THEN
        RETURN true;
    END IF;

    -- Check software_amc (vendor_address_json ->> 'city')
    IF EXISTS (SELECT 1 FROM public.software_amc WHERE vendor_address_json->>'city' = p_city_name) THEN
        RETURN true;
    END IF;

    -- Check software_amc (bank_details_json ->> 'city')
    IF EXISTS (SELECT 1 FROM public.software_amc WHERE bank_details_json->>'city' = p_city_name) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;
