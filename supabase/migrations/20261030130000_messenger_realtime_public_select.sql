-- Migration: 20261030130000_messenger_realtime_public_select.sql
-- Enables unblocked Realtime CDC delivery for Messenger tables
-- Since client WebSocket connections operate via anon role without direct Supabase Auth JWT,
-- public SELECT policies are required so Postgres replication filters do not drop live events.

DROP POLICY IF EXISTS policy_messenger_conversations_select ON public.messenger_conversations;
CREATE POLICY policy_messenger_conversations_select ON public.messenger_conversations
FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS policy_messenger_participants_select ON public.messenger_participants;
CREATE POLICY policy_messenger_participants_select ON public.messenger_participants
FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS policy_messenger_messages_select ON public.messenger_messages;
CREATE POLICY policy_messenger_messages_select ON public.messenger_messages
FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS policy_messenger_reactions_select ON public.messenger_reactions;
CREATE POLICY policy_messenger_reactions_select ON public.messenger_reactions
FOR SELECT TO public
USING (true);
