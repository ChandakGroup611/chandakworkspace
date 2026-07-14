-- Create ticket_macros (canned responses) table
CREATE TABLE IF NOT EXISTS public.ticket_macros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title varchar NOT NULL,
  content text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES public.user_master(id),
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ticket_macros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to ticket_macros" ON public.ticket_macros;
CREATE POLICY "Allow read access to ticket_macros" 
  ON public.ticket_macros FOR SELECT 
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Allow insert access to ticket_macros" ON public.ticket_macros;
CREATE POLICY "Allow insert access to ticket_macros" 
  ON public.ticket_macros FOR INSERT 
  WITH CHECK (true);

-- Insert some default macros
INSERT INTO public.ticket_macros (title, content)
VALUES 
  ('Investigating', 'We have received your ticket and our team is currently investigating the issue. We will update you shortly.'),
  ('Need Screenshot', 'Could you please provide a screenshot or a screen recording of the error you are encountering? This will help us diagnose the problem faster.'),
  ('Resolved', 'We have deployed a fix for this issue. Please refresh your application and let us know if you encounter any further problems.')
ON CONFLICT DO NOTHING;
