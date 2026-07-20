DO $$
DECLARE
    v_policy_id UUID;
    v_ticket RECORD;
    v_task RECORD;
BEGIN
    SELECT id INTO v_policy_id FROM public.ticket_sla_policies WHERE code = 'SLA_STANDARD' LIMIT 1;
    IF v_policy_id IS NULL THEN
        SELECT id INTO v_policy_id FROM public.ticket_sla_policies LIMIT 1;
    END IF;

    IF v_policy_id IS NOT NULL THEN
        -- Insert for tickets
        FOR v_ticket IN SELECT id, created_at FROM public.tickets WHERE is_deleted = false LOOP
            IF NOT EXISTS (SELECT 1 FROM public.ticket_sla_trackers WHERE ticket_id = v_ticket.id) THEN
                INSERT INTO public.ticket_sla_trackers (ticket_id, sla_policy_id, created_at)
                VALUES (v_ticket.id, v_policy_id, v_ticket.created_at);
            END IF;
        END LOOP;

        -- Insert for tasks
        FOR v_task IN SELECT id, created_at FROM public.tasks WHERE is_deleted = false LOOP
            IF NOT EXISTS (SELECT 1 FROM public.ticket_sla_trackers WHERE task_id = v_task.id) THEN
                INSERT INTO public.ticket_sla_trackers (task_id, sla_policy_id, created_at)
                VALUES (v_task.id, v_policy_id, v_task.created_at);
            END IF;
        END LOOP;
        
        -- Insert for requirements
        FOR v_task IN SELECT id, created_at FROM public.requirements WHERE is_deleted = false LOOP
            IF NOT EXISTS (SELECT 1 FROM public.ticket_sla_trackers WHERE requirement_id = v_task.id) THEN
                INSERT INTO public.ticket_sla_trackers (requirement_id, sla_policy_id, created_at)
                VALUES (v_task.id, v_policy_id, v_task.created_at);
            END IF;
        END LOOP;
    END IF;
END $$;
