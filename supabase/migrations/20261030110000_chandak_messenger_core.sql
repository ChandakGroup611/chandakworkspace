-- ==============================================================================
-- Migration: 20261030110000_chandak_messenger_core.sql
-- Description: Chandak Messenger - Universal One-Platform Live Communication Engine
-- Modules: Universal across all modules (WhatsApp-style Individual & Group Live Chat)
-- ==============================================================================

-- 1. Ensure UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Register Module in modules_master
INSERT INTO public.modules_master (code, name, description, icon, route_path, display_order, is_active)
VALUES (
    'CHANDAK_MESSENGER',
    'Chandak Messenger',
    'Universal One-Platform Live Communication: 1-on-1 Chat, Groups, Mentions & Attachments',
    'MessageSquareText',
    '#messenger',
    4,
    true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. Register Messenger Permissions in permissions table
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
    ('MESSENGER_ACCESS', 'Access Chandak Messenger', 'Chandak Messenger', 'Chat', 'VIEW', 'PAGE'),
    ('MESSENGER_SEND', 'Send Messages & Attachments', 'Chandak Messenger', 'Chat', 'CREATE', 'ACTION'),
    ('MESSENGER_GROUP_CREATE', 'Create Messenger Groups', 'Chandak Messenger', 'Groups', 'CREATE', 'ACTION'),
    ('MESSENGER_GROUP_MANAGE', 'Manage Group Members & Roles', 'Chandak Messenger', 'Groups', 'MANAGE', 'ACTION')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to Standard User and Super Administrator roles
DO $$
DECLARE
    r_record RECORD;
    p_record RECORD;
BEGIN
    FOR r_record IN SELECT id FROM public.roles WHERE code IN ('SUPER_ADMIN', 'STANDARD_USER', 'ROLE_AGENT') LOOP
        FOR p_record IN SELECT id FROM public.permissions WHERE code LIKE 'MESSENGER_%' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (r_record.id, p_record.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 4. Create messenger_conversations Table
CREATE TABLE IF NOT EXISTS public.messenger_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    title TEXT NULL,
    description TEXT NULL,
    avatar_url TEXT NULL,
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_preview TEXT NULL,
    last_message_sender_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    direct_user1_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
    direct_user2_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce single direct conversation between any two users
    CONSTRAINT uq_messenger_direct_pair UNIQUE (direct_user1_id, direct_user2_id)
);

-- Index for ordering conversations by recency
CREATE INDEX IF NOT EXISTS idx_messenger_conv_last_msg 
ON public.messenger_conversations (last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messenger_conv_type 
ON public.messenger_conversations (type);

-- 5. Create messenger_participants Table
CREATE TABLE IF NOT EXISTS public.messenger_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.messenger_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_messenger_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_messenger_participants_user 
ON public.messenger_participants (user_id, last_read_at);

CREATE INDEX IF NOT EXISTS idx_messenger_participants_conv 
ON public.messenger_participants (conversation_id);

-- 6. Create messenger_messages Table
CREATE TABLE IF NOT EXISTS public.messenger_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.messenger_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice', 'system')),
    reply_to_id UUID REFERENCES public.messenger_messages(id) ON DELETE SET NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_edited BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messenger_messages_conv_created 
ON public.messenger_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messenger_messages_sender 
ON public.messenger_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_messenger_messages_reply 
ON public.messenger_messages (reply_to_id) 
WHERE reply_to_id IS NOT NULL;

-- 7. Create messenger_reactions Table
CREATE TABLE IF NOT EXISTS public.messenger_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messenger_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_messenger_reaction UNIQUE (message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_messenger_reactions_msg 
ON public.messenger_reactions (message_id);

-- 8. Trigger to maintain last_message in messenger_conversations
CREATE OR REPLACE FUNCTION public.fn_messenger_update_last_message()
RETURNS TRIGGER AS $$
DECLARE
    v_preview TEXT;
BEGIN
    IF NEW.is_deleted = true THEN
        v_preview := 'This message was deleted';
    ELSIF NEW.message_type = 'image' THEN
        v_preview := '📷 Photo' || CASE WHEN NEW.content != '' THEN ': ' || NEW.content ELSE '' END;
    ELSIF NEW.message_type = 'file' THEN
        v_preview := '📎 Attachment' || CASE WHEN NEW.content != '' THEN ': ' || NEW.content ELSE '' END;
    ELSIF NEW.message_type = 'voice' THEN
        v_preview := '🎤 Voice Note';
    ELSIF NEW.message_type = 'system' THEN
        v_preview := 'ℹ️ ' || NEW.content;
    ELSE
        v_preview := SUBSTRING(NEW.content FROM 1 FOR 120);
    END IF;

    UPDATE public.messenger_conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = v_preview,
        last_message_sender_id = NEW.sender_id,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_messenger_message_insert ON public.messenger_messages;
CREATE TRIGGER tr_messenger_message_insert
AFTER INSERT ON public.messenger_messages
FOR EACH ROW EXECUTE FUNCTION public.fn_messenger_update_last_message();

-- 9. Row Level Security Policies
ALTER TABLE public.messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_reactions ENABLE ROW LEVEL SECURITY;

-- Conversations: A user can see conversations where they are a participant
DROP POLICY IF EXISTS policy_messenger_conversations_select ON public.messenger_conversations;
CREATE POLICY policy_messenger_conversations_select ON public.messenger_conversations
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.messenger_participants mp
        WHERE mp.conversation_id = messenger_conversations.id
          AND mp.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS policy_messenger_conversations_insert ON public.messenger_conversations;
CREATE POLICY policy_messenger_conversations_insert ON public.messenger_conversations
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
);

DROP POLICY IF EXISTS policy_messenger_conversations_update ON public.messenger_conversations;
CREATE POLICY policy_messenger_conversations_update ON public.messenger_conversations
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.messenger_participants mp
        WHERE mp.conversation_id = messenger_conversations.id
          AND mp.user_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.messenger_participants mp
        WHERE mp.conversation_id = messenger_conversations.id
          AND mp.user_id = (SELECT auth.uid())
    )
);

-- Participants: Users can view participants of conversations they belong to
DROP POLICY IF EXISTS policy_messenger_participants_select ON public.messenger_participants;
CREATE POLICY policy_messenger_participants_select ON public.messenger_participants
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.messenger_participants mp2
        WHERE mp2.conversation_id = messenger_participants.conversation_id
          AND mp2.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS policy_messenger_participants_insert ON public.messenger_participants;
CREATE POLICY policy_messenger_participants_insert ON public.messenger_participants
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
);

DROP POLICY IF EXISTS policy_messenger_participants_update ON public.messenger_participants;
CREATE POLICY policy_messenger_participants_update ON public.messenger_participants
FOR UPDATE TO authenticated
USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.messenger_participants mp
        WHERE mp.conversation_id = messenger_participants.conversation_id
          AND mp.user_id = (SELECT auth.uid())
          AND mp.role = 'admin'
    )
);

-- Messages: Users can view messages in conversations they are members of
DROP POLICY IF EXISTS policy_messenger_messages_select ON public.messenger_messages;
CREATE POLICY policy_messenger_messages_select ON public.messenger_messages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.messenger_participants mp
        WHERE mp.conversation_id = messenger_messages.conversation_id
          AND mp.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS policy_messenger_messages_insert ON public.messenger_messages;
CREATE POLICY policy_messenger_messages_insert ON public.messenger_messages
FOR INSERT TO authenticated
WITH CHECK (
    sender_id = (SELECT auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.messenger_participants mp
        WHERE mp.conversation_id = messenger_messages.conversation_id
          AND mp.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS policy_messenger_messages_update ON public.messenger_messages;
CREATE POLICY policy_messenger_messages_update ON public.messenger_messages
FOR UPDATE TO authenticated
USING (sender_id = (SELECT auth.uid()))
WITH CHECK (sender_id = (SELECT auth.uid()));

-- Reactions
DROP POLICY IF EXISTS policy_messenger_reactions_select ON public.messenger_reactions;
CREATE POLICY policy_messenger_reactions_select ON public.messenger_reactions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.messenger_messages mm
        JOIN public.messenger_participants mp ON mp.conversation_id = mm.conversation_id
        WHERE mm.id = messenger_reactions.message_id
          AND mp.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS policy_messenger_reactions_insert ON public.messenger_reactions;
CREATE POLICY policy_messenger_reactions_insert ON public.messenger_reactions
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS policy_messenger_reactions_delete ON public.messenger_reactions;
CREATE POLICY policy_messenger_reactions_delete ON public.messenger_reactions
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- 10. Enable Supabase Realtime for Chandak Messenger Tables
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_messages;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_conversations;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_participants;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_reactions;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

