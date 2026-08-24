-- Migration: Add line_items_snapshot to amc_renewals and create auto-renewal engine
ALTER TABLE public.amc_renewals 
ADD COLUMN IF NOT EXISTS line_items_snapshot JSONB;

-- Helper function to calculate next expiry
CREATE OR REPLACE FUNCTION public.calculate_next_expiry(current_expiry DATE, period_type TEXT)
RETURNS DATE AS $$
BEGIN
    IF period_type = 'Yearly' THEN
        RETURN current_expiry + INTERVAL '1 year';
    ELSIF period_type = 'Half-Yearly' THEN
        RETURN current_expiry + INTERVAL '6 months';
    ELSIF period_type = 'Quarterly' THEN
        RETURN current_expiry + INTERVAL '3 months';
    ELSIF period_type = 'Monthly' THEN
        RETURN current_expiry + INTERVAL '1 month';
    ELSE
        -- Default fallback if Custom or unknown
        RETURN current_expiry + INTERVAL '1 year';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to Auto-Process Renewals
CREATE OR REPLACE FUNCTION public.auto_process_amc_renewals()
RETURNS void AS $$
DECLARE
    rec RECORD;
    new_expiry DATE;
    renewal_cost NUMERIC;
    total_cost NUMERIC;
    line_item JSONB;
BEGIN
    -- Find active AMCs where expiry is today or passed, and it has a recurring period
    FOR rec IN 
        SELECT id, software_name, provider_name, expiry_date, assigned_to, renewal_period_type, solution_line_items, cost
        FROM public.software_amc
        WHERE status = 'Active' 
        AND expiry_date IS NOT NULL
        AND expiry_date <= CURRENT_DATE
        AND renewal_period_type IS NOT NULL
        AND renewal_period_type != 'Custom'
    LOOP
        -- Prevent duplicate renewals if already renewed for this cycle
        IF EXISTS (
            SELECT 1 FROM public.amc_renewals 
            WHERE amc_id = rec.id 
            AND previous_expiry = rec.expiry_date
        ) THEN
            CONTINUE;
        END IF;

        new_expiry := public.calculate_next_expiry(rec.expiry_date, rec.renewal_period_type);

        -- Calculate cost from line items or fallback to base cost
        total_cost := 0;
        IF rec.solution_line_items IS NOT NULL AND jsonb_array_length(rec.solution_line_items) > 0 THEN
            FOR line_item IN SELECT * FROM jsonb_array_elements(rec.solution_line_items)
            LOOP
                total_cost := total_cost + COALESCE((line_item->>'netAmount')::NUMERIC, 0);
            END LOOP;
        ELSE
            total_cost := COALESCE(rec.cost, 0);
        END IF;

        -- Insert renewal (this will trigger auto_generate_renewal_invoices and sync_amc_renewals)
        INSERT INTO public.amc_renewals (
            amc_id,
            renewal_cost,
            previous_expiry,
            new_expiry,
            renewal_date,
            line_items_snapshot,
            notes,
            created_by
        ) VALUES (
            rec.id,
            total_cost,
            rec.expiry_date,
            new_expiry,
            CURRENT_DATE,
            rec.solution_line_items,
            'System Auto-Renewal for ' || rec.renewal_period_type || ' period',
            rec.assigned_to
        );

        -- Insert into event_queue for notification
        INSERT INTO public.event_queue (event_type, payload, status)
        VALUES (
            'AMC_RENEWAL_AUTO_GENERATED',
            jsonb_build_object(
                'amc_id', rec.id,
                'software_name', rec.software_name,
                'provider_name', rec.provider_name,
                'new_expiry', new_expiry,
                'renewal_cost', total_cost,
                'assigned_to', rec.assigned_to
            ),
            'PENDING'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enhance Expiration Check to trigger notifications BEFORE expiry based on notify_before_days
CREATE OR REPLACE FUNCTION public.check_amc_expirations()
RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT id, provider_name, software_name, expiry_date, assigned_to, notify_before_days
        FROM public.software_amc
        WHERE status = 'Active' 
        AND expiry_date IS NOT NULL
        AND notify_before_days IS NOT NULL
        AND (expiry_date - INTERVAL '1 day' * notify_before_days)::DATE = CURRENT_DATE
    LOOP
        -- Insert into event_queue to be picked up by the notification engine
        INSERT INTO public.event_queue (event_type, payload, status)
        VALUES (
            'AMC_EXPIRATION_ALERT',
            jsonb_build_object(
                'amc_id', rec.id,
                'software_name', rec.software_name,
                'provider_name', rec.provider_name,
                'expiry_date', rec.expiry_date,
                'assigned_to', rec.assigned_to,
                'days_remaining', rec.notify_before_days
            ),
            'PENDING'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
