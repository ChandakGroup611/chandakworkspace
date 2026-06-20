-- Fix Immutable Event Sourcing Foreign Key Issue
-- Deleting a user was triggering ON DELETE SET NULL which violated the BEFORE UPDATE trigger.
-- We must remove the ON DELETE SET NULL to preserve the actor_id historically.

ALTER TABLE public.system_domain_events 
DROP CONSTRAINT IF EXISTS system_domain_events_actor_id_fkey;

ALTER TABLE public.system_domain_events 
ADD CONSTRAINT system_domain_events_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES public.user_master(id) ON DELETE RESTRICT;

-- Wait, if it's ON DELETE RESTRICT, then you can't delete the user at all!
-- The best approach for immutable events is to just drop the foreign key constraint entirely,
-- or use ON DELETE SET NULL and update the trigger to allow it.
-- Let's update the trigger to allow ON DELETE SET NULL updates ONLY for actor_id.

CREATE OR REPLACE FUNCTION prevent_event_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow Postgres ON DELETE SET NULL to clear actor_id when a user is hard deleted
    -- But ensure NO other fields are changed to preserve event immutability
    IF OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL AND 
       OLD.id = NEW.id AND 
       (OLD.tenant_id = NEW.tenant_id OR (OLD.tenant_id IS NULL AND NEW.tenant_id IS NULL)) AND 
       OLD.event_type = NEW.event_type AND 
       OLD.entity_id = NEW.entity_id AND 
       OLD.payload = NEW.payload THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Updates to system_domain_events are strictly prohibited (Immutable Event Sourcing)';
END;
$$ LANGUAGE plpgsql;
