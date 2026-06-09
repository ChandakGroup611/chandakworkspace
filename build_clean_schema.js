const fs = require('fs');
const path = require('path');

// Step 1: Read all migrations and extract policies
const files = fs.readdirSync('supabase/migrations').filter(f => /^\d+.*\.sql$/.test(f)).sort();
let ddl = '';
let policies = '';
for(let f of files) {
    const p = path.join('supabase/migrations', f);
    const content = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').replace(/\x00/g, '');
    const lines = content.split('\n');
    let inPolicy = false;
    let policyBuffer = '';
    for(let i=0; i<lines.length; i++) {
        const l = lines[i];
        if(l.match(/^\s*(CREATE|DROP)\s+POLICY/i) && !l.includes('%I') && !l.includes('policy_super_admin_bypass_all ON public.')) {
            inPolicy = true;
            policyBuffer += l + '\n';
            if(l.includes(';')) {
                if(!policyBuffer.match(/ON\s+(?:public\.)?(workspace_tasks|sub_workspaces|sub_workspace_members|ticket_meetings|ticket_chats|ticket_watchers|ticket_activity_stream|websocket_queue|task_teams|task_assignees)\b/im)) {
                    policies += policyBuffer + '\n';
                }
                inPolicy = false;
                policyBuffer = '';
            }
        } else if(inPolicy) {
            policyBuffer += l + '\n';
            if(l.includes(';')) {
                if(!policyBuffer.match(/ON\s+(?:public\.)?(workspace_tasks|sub_workspaces|sub_workspace_members|ticket_meetings|ticket_chats|ticket_watchers|ticket_activity_stream|websocket_queue|task_teams|task_assignees)\b/im)) {
                    policies += policyBuffer + '\n';
                }
                inPolicy = false;
                policyBuffer = '';
            }
        } else {
            ddl += l + '\n';
        }
    }
}

let ddlLines = ddl.split('\n');

// Step 2: Fix legacy references AFTER tables are dropped/renamed
let dropWorkspaceTasks = -1;
let renameSubWorkspaces = -1;

for(let i=0; i<ddlLines.length; i++) {
    // FIX REDUNDANT LANGUAGE PLPGSQL SAFELY!
    if (ddlLines[i].includes('RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER')) {
        ddlLines[i] = ddlLines[i].replace('RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER', 'RETURNS TEXT SECURITY DEFINER');
    }

    // FIX POSTGRES FUNCTION AMBIGUITY (Overloaded functions with DEFAULT NULL)
    if (ddlLines[i].includes('p_resource_kind TEXT DEFAULT NULL')) {
        ddlLines[i] = ddlLines[i].replace('p_resource_kind TEXT DEFAULT NULL', 'p_resource_kind TEXT');
    }
    if (ddlLines[i].includes('p_visibility_settings JSONB DEFAULT NULL')) {
        ddlLines[i] = ddlLines[i].replace('p_visibility_settings JSONB DEFAULT NULL', 'p_visibility_settings JSONB');
    }

    if(ddlLines[i].includes('DROP TABLE IF EXISTS public.workspace_tasks CASCADE')) {
        dropWorkspaceTasks = i;
    }
    if(ddlLines[i].includes('ALTER TABLE IF EXISTS public.sub_workspaces RENAME TO deprecated_sub_workspaces')) {
        renameSubWorkspaces = i;
    }
}

if(dropWorkspaceTasks > -1) {
    // Start replacing AFTER the drop statement!
    for(let i=dropWorkspaceTasks+1; i<ddlLines.length; i++) {
        // Fix stray ADD COLUMN statements that were originally for workspace_tasks but are now for tasks
        if (ddlLines[i].includes('ADD COLUMN') && !ddlLines[i].includes('IF NOT EXISTS')) {
            ddlLines[i] = ddlLines[i].replace(/ADD COLUMN/g, 'ADD COLUMN IF NOT EXISTS');
        }
        ddlLines[i] = ddlLines[i].replace(/public\.workspace_tasks/g, 'public.tasks').replace(/\bworkspace_tasks\b/g, 'tasks');
    }
}

if(renameSubWorkspaces > -1) {
    for(let i=renameSubWorkspaces+1; i<ddlLines.length; i++) {
        ddlLines[i] = ddlLines[i].replace(/public\.sub_workspaces/g, 'public.deprecated_sub_workspaces').replace(/\bsub_workspaces\b/g, 'deprecated_sub_workspaces');
    }
}

ddl = ddlLines.join('\n');

// Also replace in policies block, since policies are appended to the very end of the file
policies = policies.replace(/public\.workspace_tasks/g, 'public.tasks').replace(/\bworkspace_tasks\b/g, 'tasks');
policies = policies.replace(/public\.sub_workspaces/g, 'public.deprecated_sub_workspaces').replace(/\bsub_workspaces\b/g, 'deprecated_sub_workspaces');
policies = policies.replace(/public\.sub_workspace_members/g, 'public.deprecated_sub_workspace_members').replace(/\bsub_workspace_members\b/g, 'deprecated_sub_workspace_members');
policies = policies.replace(/public\.master_priorities/g, 'public.priority_master').replace(/\bmaster_priorities\b/g, 'priority_master');
policies = policies.replace(/public\.workflow_states/g, 'public.status_master').replace(/\bworkflow_states\b/g, 'status_master');

// Fix dropped department_id column in legacy workspaces policies
policies = policies.replace(/OR \(department_id IS NOT NULL AND department_id = ANY\(ups\.department_scope\)\)/g, '/* dropped department_id check */');

// Fix column names in task policies to match the new tasks table schema
policies = policies.replace(/wt\.creator_id/g, 'wt.created_by');
policies = policies.replace(/wt\.assignee_id/g, 'wt.assigned_to');

// Fix owner_id to workspace_owner_id specifically in workspaces policies that failed to update it
policies = policies.replace(/owner_id = auth\.uid\(\) OR has_permission_snapshot\('WORKSPACES_MANAGE'\)/g, "workspace_owner_id = auth.uid() OR has_permission_snapshot('WORKSPACES_MANAGE')");
policies = policies.replace(/public\.can_see_record\(owner_id, NULL\)/g, "public.can_see_record(workspace_owner_id, NULL)");
policies = policies.replace(/public\.can_see_workspace\(id, owner_id\)/g, "public.can_see_workspace(id, workspace_owner_id)");
policies = policies.replace(/public\.can_see_workspace\(workspaces\.id, workspaces\.owner_id\)/g, "public.can_see_workspace(workspaces.id, workspaces.workspace_owner_id)");

// IDEMPOTENCY FIX: Inject DROP POLICY IF EXISTS before EVERY CREATE POLICY statement in the policy block
// This prevents ANY "policy already exists" errors when migrating legacy duplicated policies.
policies = policies.replace(/CREATE\s+POLICY\s+("?[a-zA-Z0-9_]+"?)\s+ON\s+([a-zA-Z0-9_\.]+)/gi, 'DROP POLICY IF EXISTS $1 ON $2;\nCREATE POLICY $1 ON $2');

// Step 3: Append fixed functions to overwrite the broken ones evaluated by RLS
// REMOVED task_teams since it was dropped from the schema in migration 20260601000000
const fixSQL = `
-- ============================================================================
-- FINAL FUNCTION OVERWRITES TO FIX LEGACY REFERENCES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_see_task(p_task_id UUID, p_creator_id UUID) 
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF public.is_super_admin() THEN RETURN TRUE; END IF; 
    IF auth.uid() = p_creator_id THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.task_participants WHERE task_id = p_task_id AND user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.tasks t JOIN public.workspace_members wm ON t.workspace_id = wm.workspace_id WHERE t.id = p_task_id AND wm.user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    RETURN FALSE; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.is_task_member(p_task_id UUID) 
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF public.is_super_admin() THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.tasks WHERE id = p_task_id AND created_by = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.task_participants WHERE task_id = p_task_id AND user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    RETURN FALSE; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.can_see_workspace(p_workspace_id UUID) 
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF public.is_super_admin() THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND workspace_owner_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.workspaces w JOIN public.user_master u ON w.company_id = u.company_id JOIN public.role_master r ON u.role_id = r.id WHERE w.id = p_workspace_id AND u.id = auth.uid() AND r.role_name IN ('COMPANY_ADMIN', 'COMPANY_OWNER')) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.tasks t WHERE t.workspace_id = p_workspace_id AND (t.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.task_participants ta WHERE ta.task_id = t.id AND ta.user_id = auth.uid()))) THEN RETURN TRUE; END IF; 
    RETURN FALSE; 
END; 
$$;
`;

// Write to final file
fs.writeFileSync('guaranteed_schema.sql', ddl + '\n' + fixSQL + '\n\n-- POLICIES DEFERRED TO END --\n\n' + policies, 'utf8');
console.log('Successfully regenerated guaranteed_schema.sql with workspaces department_id fix.');
