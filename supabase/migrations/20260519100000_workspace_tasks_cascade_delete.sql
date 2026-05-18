-- ==========================================
-- Workspace Tasks Cascade Delete Normalization
-- Migration: 20260519100000_workspace_tasks_cascade_delete.sql
-- ==========================================

-- 1. Alter task_checklists foreign key to ON DELETE CASCADE
ALTER TABLE public.task_checklists 
    DROP CONSTRAINT IF EXISTS task_checklists_task_id_fkey;

ALTER TABLE public.task_checklists 
    ADD CONSTRAINT task_checklists_task_id_fkey 
    FOREIGN KEY (task_id) 
    REFERENCES public.workspace_tasks(id) 
    ON DELETE CASCADE;

-- 2. Alter task_comments foreign key to ON DELETE CASCADE
ALTER TABLE public.task_comments 
    DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey;

ALTER TABLE public.task_comments 
    ADD CONSTRAINT task_comments_task_id_fkey 
    FOREIGN KEY (task_id) 
    REFERENCES public.workspace_tasks(id) 
    ON DELETE CASCADE;
