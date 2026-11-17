-- Migration: Status migration, Title Case standardization, SUPER ADMIN activation, and Email update
-- Executed on live database with explicit user approval on 2026-11-17

-- 1. Reassign tasks using 'Task Completed' and 'Resolved' to 'Closed'
UPDATE public.tasks 
SET status_id = '3392636b-59ff-4d04-b103-55d2cb9c6b27' 
WHERE status_id IN (
  'b74ee75a-7f62-4123-a101-32b6313de2a0', -- Task Completed
  '63ed2aee-a3d8-4084-a470-94ccda56973a'  -- Resolved
);

-- 2. Deactivate and soft-delete 'Task Completed' and 'Resolved' in status_master
UPDATE public.status_master 
SET is_deleted = true, is_active = false 
WHERE id IN (
  'b74ee75a-7f62-4123-a101-32b6313de2a0', 
  '63ed2aee-a3d8-4084-a470-94ccda56973a'
);

-- 3. Standardize task status names to consistent Title Case
UPDATE public.status_master SET status_name = 'New' WHERE id = 'e6a4e794-b694-45a1-a55d-4baaed5062f9';
UPDATE public.status_master SET status_name = 'Hold' WHERE id = 'dc495497-4d84-498f-81bb-aa618197f0f6';
UPDATE public.status_master SET status_name = 'To Do' WHERE id = 'dd403fda-9278-4c1c-b352-da53379b2e62';
UPDATE public.status_master SET status_name = 'Need to Check' WHERE id = 'f499ada2-9354-49ff-8635-e39672546eea';

-- 4. Activate SUPER ADMIN so it appears in workspace filters & member lists
UPDATE public.user_master 
SET is_active = true 
WHERE id = '53b7dbae-6049-44a7-a9c1-4ba769b4c324';

-- 5. Update contact email to Noreply@chandakgroup.com
UPDATE public.user_master 
SET email = 'Noreply@chandakgroup.com' 
WHERE email = 'it.support@chandakgroup.com';
