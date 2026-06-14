-- Drop implicit duplicate constraints created by supabase to favor explicit ones defined in 20260520011549_add_user_master_foreign_keys.sql
ALTER TABLE public.user_master DROP CONSTRAINT IF EXISTS user_master_department_id_fkey;
ALTER TABLE public.user_master DROP CONSTRAINT IF EXISTS user_master_designation_id_fkey;
ALTER TABLE public.user_master DROP CONSTRAINT IF EXISTS user_master_role_id_fkey;
