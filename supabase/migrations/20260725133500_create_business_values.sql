CREATE TABLE IF NOT EXISTS public.business_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_values ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'business_values' AND policyname = 'Allow authenticated read'
    ) THEN
        CREATE POLICY "Allow authenticated read" ON public.business_values
            FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'business_values' AND policyname = 'Allow admin insert'
    ) THEN
        CREATE POLICY "Allow admin insert" ON public.business_values
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END
$$;

INSERT INTO public.business_values (name) 
SELECT v FROM unnest(ARRAY[
    'Revenue Generation',
    'Cost Reduction / Savings',
    'Operational Efficiency',
    'Customer Experience / Satisfaction',
    'Risk Mitigation & Security',
    'Regulatory & Compliance',
    'Strategic Alignment',
    'Technical Debt Reduction'
]) v
WHERE NOT EXISTS (SELECT 1 FROM public.business_values);
