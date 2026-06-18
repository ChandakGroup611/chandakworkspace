ALTER TABLE public.tasks ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department_id);
