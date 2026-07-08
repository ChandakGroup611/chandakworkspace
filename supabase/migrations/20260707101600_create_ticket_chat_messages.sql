CREATE TABLE IF NOT EXISTS public.ticket_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ticket_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to ticket_chat_messages" ON public.ticket_chat_messages;
CREATE POLICY "Allow read access to ticket_chat_messages" ON public.ticket_chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert access to ticket_chat_messages" ON public.ticket_chat_messages;
CREATE POLICY "Allow insert access to ticket_chat_messages" ON public.ticket_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
