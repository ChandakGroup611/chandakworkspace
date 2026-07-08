CREATE TABLE IF NOT EXISTS public.ticket_relations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  target_ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  relation_type varchar NOT NULL CHECK (relation_type IN ('DUPLICATE', 'RELATED', 'BLOCKS', 'BLOCKED_BY')),
  created_by uuid REFERENCES public.user_master(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ticket_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to ticket_relations" 
  ON public.ticket_relations FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert access to ticket_relations" 
  ON public.ticket_relations FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow delete access to ticket_relations" 
  ON public.ticket_relations FOR DELETE 
  USING (true);
