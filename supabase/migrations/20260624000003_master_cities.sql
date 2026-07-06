CREATE TABLE IF NOT EXISTS public.master_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_name TEXT NOT NULL,
    city_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(state_name, city_name)
);

ALTER TABLE public.master_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.master_cities;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.master_cities;
CREATE POLICY "Enable read access for all users" ON public.master_cities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.master_cities;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.master_cities;
CREATE POLICY "Enable insert access for all users" ON public.master_cities FOR INSERT WITH CHECK (true);
