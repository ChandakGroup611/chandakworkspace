-- Migration to fix designations -> departments foreign key
-- Changes the constraint to ON DELETE CASCADE so deleting a department deletes its designations

ALTER TABLE public.designations
DROP CONSTRAINT IF EXISTS designations_department_id_fkey;

ALTER TABLE public.designations
ADD CONSTRAINT designations_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES public.departments(id)
ON DELETE CASCADE;
