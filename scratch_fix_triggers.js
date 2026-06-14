const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();

  const query = `
CREATE OR REPLACE FUNCTION validate_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_is_valid BOOLEAN := false;
    v_current_ws UUID;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        -- Check hierarchy: is the assignee a member of this workspace or any ancestor?
        v_current_ws := NEW.workspace_id;
        
        WHILE v_current_ws IS NOT NULL AND NOT v_is_valid LOOP
            SELECT EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = v_current_ws 
                AND user_id = NEW.assigned_to
                AND is_deleted = false
            ) INTO v_is_valid;
            
            IF NOT v_is_valid THEN
                -- move up to parent
                SELECT parent_workspace_id INTO v_current_ws
                FROM public.workspaces
                WHERE id = v_current_ws;
            END IF;
        END LOOP;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Assignment Violation: Task assignee must be an active member of the corresponding workspace.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_sub_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_task_workspace_id UUID;
    v_is_valid BOOLEAN := false;
    v_current_ws UUID;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        -- Get the workspace scope of the parent task
        SELECT workspace_id INTO v_task_workspace_id
        FROM public.tasks
        WHERE id = NEW.task_id;

        -- Check hierarchy
        v_current_ws := v_task_workspace_id;
        WHILE v_current_ws IS NOT NULL AND NOT v_is_valid LOOP
            SELECT EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = v_current_ws 
                AND user_id = NEW.assigned_to
                AND is_deleted = false
            ) INTO v_is_valid;
            
            IF NOT v_is_valid THEN
                SELECT parent_workspace_id INTO v_current_ws
                FROM public.workspaces
                WHERE id = v_current_ws;
            END IF;
        END LOOP;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Assignment Violation: Sub-task assignee must be an active member of the parent task''s workspace.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    await client.query(query);
    console.log("Successfully updated triggers!");
  } catch (err) {
    console.error("Error updating triggers:", err);
  } finally {
    await client.end();
  }
}

run();
