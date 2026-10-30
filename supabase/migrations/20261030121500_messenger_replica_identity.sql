-- Set REPLICA IDENTITY FULL on all messenger tables to ensure Realtime UPDATE filters (conversation_id, user_id) work properly
ALTER TABLE public.messenger_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messenger_participants REPLICA IDENTITY FULL;
ALTER TABLE public.messenger_messages REPLICA IDENTITY FULL;
ALTER TABLE public.messenger_reactions REPLICA IDENTITY FULL;

