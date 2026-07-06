-- 20260621000000_universal_trash_framework.sql

CREATE TABLE IF NOT EXISTS public.delete_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_by UUID REFERENCES public.user_master(id),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    root_entity_type VARCHAR(50) NOT NULL,
    root_entity_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    reason TEXT
);

-- Automatically add lifecycle metadata columns to any table that has an is_deleted column
DO $$ 
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.table_schema = 'public'
        AND c.column_name = 'is_deleted'
        AND t.table_type = 'BASE TABLE'
        AND c.table_name NOT IN ('delete_batches')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE', t_name);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.user_master(id)', t_name);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS delete_reason TEXT', t_name);
        
        -- Try to add the delete_batch_id column. We use exception handling in case a foreign key cannot be added cleanly due to locking, but usually it's fine.
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS delete_batch_id UUID REFERENCES public.delete_batches(id)', t_name);
        EXCEPTION WHEN duplicate_column THEN
            -- Ignore if it already exists
        END;
    END LOOP;
END $$;
