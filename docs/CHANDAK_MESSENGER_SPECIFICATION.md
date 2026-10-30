# Chandak Messenger — Universal One-Platform Live Communication Engine

**Status:** Implemented & Verified  
**Date:** 30 October 2026  
**Access Point:** Global Header Navbar (`components/layout/Navbar.tsx`) beside Realtime Notifications  
**Shortcut:** `Ctrl+M` / `Cmd+M`  

---

## 1. Architectural Overview & Purpose

Chandak Messenger is the universal real-time communication platform built directly into Chandak Workspace. It unifies workplace chat across all modules (**Workspaces**, **Tasks**, **Tickets**, **FleetDesk**, **Design Tracking**, **Organization Budget**, **AMC**, **IAM**, and **Masters**) without forcing users to navigate away from their active workflows.

```
+-----------------------------------------------------------------------------------------+
|                                    CHANDAK WORKSPACE                                    |
|                                                                                         |
|  [Logo] [Search...]                   [Theme] [Settings] [Notifs] [💬 Messenger] [User] |
+---------------------------------------------------------------------+-------------------+
                                                                      |
                                         +----------------------------v-------------------+
                                         |              CHANDAK MESSENGER                 |
                                         |                                                |
                                         |  +--------------------+---------------------+  |
                                         |  | Conversation List  | Active Chat Feed    |  |
                                         |  | - Direct 1-on-1    | - Realtime Bubbles  |  |
                                         |  | - Team Groups      | - @Mentions         |  |
                                         |  | - Unread Filters   | - Dual View/Download|  |
                                         |  | - Search Users     | - Voice Player      |  |
                                         |  | - + New Chat/Group | - Rich Composer     |  |
                                         |  +--------------------+---------------------+  |
                                         +------------------------------------------------+
```

---

## 2. Core Capabilities

### A. Individual Direct Messaging (1-on-1 DMs)
* **User Discovery**: Automatically fetches all active colleagues from `public.user_master`.
* **Search & Filter**: Search colleagues by full name, email, department, or designation.
* **Canonical Deduplication**: Enforces canonical user pair ordering `(direct_user1_id, direct_user2_id)` with a database uniqueness constraint, guaranteeing two colleagues always share exactly one conversation thread.
* **Online Presence**: Live presence indicator anchored to active login sessions.

### B. Group Messaging & Team Channels
* **Group Creation**: Create named groups with custom titles, optional descriptions, and selected workspace members.
* **Role Hierarchy**: Group creator is assigned the `admin` role, allowing them to add new members or manage group settings.
* **Member Management**: Interactive group details modal displaying all participants with departmental metadata, add-member workflows, and leave-group capability.
* **System Audit Messages**: Automatic system announcements for group creations, member additions, and departures.

### C. Rich Realtime Messaging Engine
* **Supabase Realtime**: Instant push delivery via `supabase_realtime` publication on `messenger_messages`, `messenger_conversations`, and `messenger_participants`.
* **Unread Counters**: Live unread badges on the Navbar trigger button (`ChandakMessengerTrigger`) and individual conversation items in the list.
* **Mentions System (`@mention`)**: 
  - Typing `@` triggers an auto-complete dropdown of workspace members or `@all`.
  - Highlighted inline mention pills with distinct visual emphasis.
* **Quoted Replies**: One-click reply quoting earlier messages, rendering original context and sender snippet above the reply bubble.
* **Emoji Reactions**: Instant emoji reactions (👍, ❤️, 😂, 😮, 🙏, etc.) with reaction counters.
* **Voice Notes**: In-browser recording via Web Audio `MediaRecorder`, elapsed timer, waveform representation, and inline audio player.
* **Soft Deletion**: Non-destructive deletion ("This message was deleted") preserving chronological thread integrity.

### D. Mandatory Document View & Download Compliance (Zero Blind Uploads)
* **Storage Integration**: Files upload to dedicated private storage bucket `chat-attachments` via `initializeAttachmentUpload`.
* **Dual View & Download**:
  - **View**: In-app modal viewer (`AttachmentPreviewModal`) for images, PDFs, and formatted documents.
  - **Download**: Direct retrieval via signed proxy route `/api/proxy-attachment/[id]?download=1`.
* **Pre-Upload Staging**: Staged files display filename, file size, thumbnail/icon, local preview, and instant remove buttons prior to submission.

---

## 3. Database Schema

### `public.messenger_conversations`
* `id` (UUID, Primary Key)
* `type` (`'direct' | 'group'`)
* `title`, `description`, `avatar_url`
* `created_by` (FK -> `user_master.id`)
* `last_message_at` (TIMESTAMPTZ, Indexed DESC)
* `last_message_preview` (TEXT)
* `last_message_sender_id` (FK -> `user_master.id`)
* `direct_user1_id`, `direct_user2_id` (Unique pair for direct chats)
* `is_archived` (BOOLEAN)
* `created_at`, `updated_at`

### `public.messenger_participants`
* `id` (UUID, Primary Key)
* `conversation_id` (FK -> `messenger_conversations.id` ON DELETE CASCADE)
* `user_id` (FK -> `user_master.id` ON DELETE CASCADE)
* `role` (`'admin' | 'member'`)
* `last_read_at` (TIMESTAMPTZ)
* `is_pinned` (BOOLEAN)
* `is_muted` (BOOLEAN)
* `UNIQUE (conversation_id, user_id)`

### `public.messenger_messages`
* `id` (UUID, Primary Key)
* `conversation_id` (FK -> `messenger_conversations.id` ON DELETE CASCADE)
* `sender_id` (FK -> `user_master.id` ON DELETE CASCADE)
* `content` (TEXT)
* `message_type` (`'text' | 'image' | 'file' | 'voice' | 'system'`)
* `reply_to_id` (FK -> `messenger_messages.id` ON DELETE SET NULL)
* `attachments` (JSONB)
* `mentions` (JSONB)
* `is_edited`, `is_deleted` (BOOLEAN)
* `created_at`, `updated_at`

### `public.messenger_reactions`
* `id` (UUID, Primary Key)
* `message_id` (FK -> `messenger_messages.id` ON DELETE CASCADE)
* `user_id` (FK -> `user_master.id` ON DELETE CASCADE)
* `reaction` (TEXT)
* `UNIQUE (message_id, user_id, reaction)`

---

## 4. Automated Verification & Test Coverage

Verified via `scripts/test-messenger-e2e.js`:
* `11 / 11` test assertions passing (Module registration, Permissions, User directory fetch, Direct chat deduplication, Realtime trigger synchronization, Mentions, Attachments, Emoji reactions, Group admin lifecycle, Soft deletion, and Realtime publication verification).

