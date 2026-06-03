-- ============================================================================
-- Phase 10: Auto-incrementing Sequence Generation
-- ============================================================================

-- 1. Create tracking table
CREATE TABLE IF NOT EXISTS public.series_tracker (
    prefix VARCHAR(10) NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    month VARCHAR(2) NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix, financial_year, month)
);

ALTER TABLE public.series_tracker DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.series_tracker TO authenticated, anon, service_role;

-- 2. Function to generate the next code (Indian Financial Year: Apr-Mar)
CREATE OR REPLACE FUNCTION public.generate_series_code(p_prefix VARCHAR)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_fy VARCHAR(10);
    v_month VARCHAR(2);
    v_next_val INTEGER;
    v_date DATE := CURRENT_DATE;
    v_year INTEGER;
    v_month_int INTEGER;
    v_code TEXT;
BEGIN
    v_year := EXTRACT(YEAR FROM v_date);
    v_month_int := EXTRACT(MONTH FROM v_date);
    
    -- Indian Financial Year (April to March)
    IF v_month_int >= 4 THEN
        v_fy := v_year::TEXT || '-' || SUBSTRING((v_year + 1)::TEXT FROM 3 FOR 2);
    ELSE
        v_fy := (v_year - 1)::TEXT || '-' || SUBSTRING(v_year::TEXT FROM 3 FOR 2);
    END IF;
    
    v_month := LPAD(v_month_int::TEXT, 2, '0');
    
    -- Insert or update the tracker
    INSERT INTO public.series_tracker (prefix, financial_year, month, last_value)
    VALUES (p_prefix, v_fy, v_month, 1)
    ON CONFLICT (prefix, financial_year, month)
    DO UPDATE SET last_value = public.series_tracker.last_value + 1
    RETURNING last_value INTO v_next_val;
    
    -- e.g. WS-2026-27/06/0001
    v_code := p_prefix || '-' || v_fy || '/' || v_month || '/' || LPAD(v_next_val::TEXT, 4, '0');
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 3. Add task_code to tasks if not exists
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_code VARCHAR(50);

-- Backfill existing workspaces if they match the Math.random pattern (WS-XXXXXX)
UPDATE public.workspaces 
SET workspace_code = public.generate_series_code('WS')
WHERE workspace_code LIKE 'WS-%' AND LENGTH(workspace_code) <= 10;

-- Backfill existing tasks
UPDATE public.tasks
SET task_code = public.generate_series_code(CASE WHEN parent_task_id IS NULL THEN 'TSK' ELSE 'STK' END)
WHERE task_code IS NULL;

-- Make task_code UNIQUE and NOT NULL for future inserts (optional but good practice)
-- ALTER TABLE public.tasks ALTER COLUMN task_code SET NOT NULL;
-- We'll just enforce via trigger for now.

-- 4. Triggers
CREATE OR REPLACE FUNCTION public.set_workspace_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_workspace_id IS NOT NULL THEN
        -- It's a sub-workspace
        IF NEW.workspace_code IS NULL OR (NEW.workspace_code LIKE 'WS-%' AND length(NEW.workspace_code) <= 15) THEN
            NEW.workspace_code := public.generate_series_code('SWS');
        END IF;
    ELSE
        -- It's a workspace
        IF NEW.workspace_code IS NULL OR (NEW.workspace_code LIKE 'WS-%' AND length(NEW.workspace_code) <= 15) THEN
            NEW.workspace_code := public.generate_series_code('WS');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_workspace_code ON public.workspaces;
CREATE TRIGGER trigger_set_workspace_code
BEFORE INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.set_workspace_code();

CREATE OR REPLACE FUNCTION public.set_task_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_task_id IS NOT NULL THEN
        -- It's a sub-task
        IF NEW.task_code IS NULL THEN
            NEW.task_code := public.generate_series_code('STK');
        END IF;
    ELSE
        -- It's a task
        IF NEW.task_code IS NULL THEN
            NEW.task_code := public.generate_series_code('TSK');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_task_code ON public.tasks;
CREATE TRIGGER trigger_set_task_code
BEFORE INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_task_code();
