"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Maximize2,
  Minimize2,
  MessageSquareText,
  Users,
  MessageSquarePlus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  MessengerConversation,
  WorkspaceUser,
  fetchMessengerConversations,
  fetchWorkspaceUsersForMessenger,
  markConversationAsRead,
} from "@/lib/actions/messenger";
import { ConversationList } from "./ConversationList";
import { ConversationView } from "./ConversationView";
import { NewChatModal } from "./NewChatModal";
import { NewGroupModal } from "./NewGroupModal";
import { createClient } from "@/utils/supabase/client";

interface ChandakMessengerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  initialConversationId?: string | null;
  onClearInitialConversation?: () => void;
  onUnreadChange?: () => void;
}

export function ChandakMessengerDrawer({
  isOpen,
  onClose,
  currentUserId,
  initialConversationId,
  onClearInitialConversation,
  onUnreadChange,
}: ChandakMessengerDrawerProps) {
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<MessengerConversation | null>(null);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Modals
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeConversationRef = useRef(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Open initial conversation if passed from notification
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const match = conversations.find((c) => c.id === initialConversationId);
      if (match) {
        setActiveConversation(match);
        setConversations((prev) =>
          prev.map((c) => (c.id === match.id ? { ...c, unread_count: 0 } : c))
        );
        markConversationAsRead(match.id).then(() => {
          onUnreadChange?.();
        });
        onClearInitialConversation?.();
      }
    }
  }, [initialConversationId, conversations, onClearInitialConversation, onUnreadChange]);

  // Fetch initial conversations and workspace users
  const loadData = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const [convs, users] = await Promise.all([
        fetchMessengerConversations(),
        fetchWorkspaceUsersForMessenger(),
      ]);
      setConversations(convs);
      setWorkspaceUsers(users);

      // If active conversation is open, update its reference
      if (activeConversationRef.current) {
        const updated = convs.find((c) => c.id === activeConversationRef.current?.id);
        if (updated) setActiveConversation(updated);
      }
    } catch (err) {
      console.error("Error loading messenger data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const handleSelectConversation = useCallback(
    (conv: MessengerConversation) => {
      setActiveConversation(conv);
      activeConversationRef.current = conv;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chandak:messenger-drawer-state", {
            detail: { isOpen: true, activeConversationId: conv.id },
          })
        );
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
      );
      markConversationAsRead(conv.id).then(() => {
        onUnreadChange?.();
      });
    },
    [onUnreadChange]
  );

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Global Realtime listener for incoming messages to refresh conversation previews & unread counts
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("messenger_global_drawer")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messenger_messages",
        },
        (payload) => {
          if (activeConversationRef.current?.id === payload.new.conversation_id) {
            markConversationAsRead(payload.new.conversation_id).catch(() => {});
          }
          loadData();
          onUnreadChange?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messenger_conversations",
        },
        () => {
          loadData();
          onUnreadChange?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messenger_participants",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, loadData, onUnreadChange]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-drawer,9990)] flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      {/* Main Container */}
      <div
        className={`relative z-10 flex flex-col bg-elevated border-l border-border shadow-2xl transition-all duration-200 overflow-hidden ${
          isMaximized ? "w-full h-full" : "w-full max-w-5xl h-full"
        }`}
      >
        {/* Universal Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-accent text-accent-contrast">
              <MessageSquareText className="h-4 w-4" />
            </span>
            <div className="flex items-baseline gap-2">
              <h1 className="text-sm font-bold text-foreground">Chandak Messenger</h1>
              <span className="text-[11px] text-muted hidden sm:inline">
                One-Platform Communication
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
              title={isMaximized ? "Restore size" : "Maximize window"}
              aria-label={isMaximized ? "Restore size" : "Maximize window"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
              title="Close Messenger (Esc)"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Area: WhatsApp Web Style 2-Column Split */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Column: Conversation List */}
          <div
            className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
              activeConversation ? "hidden md:flex" : "flex"
            } flex-col`}
          >
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversation?.id || null}
              currentUserId={currentUserId}
              onSelectConversation={handleSelectConversation}
              onOpenNewChat={() => setShowNewChat(true)}
              onOpenNewGroup={() => setShowNewGroup(true)}
              onRefresh={loadData}
              loading={loading}
            />
          </div>

          {/* Right Column: Active Conversation Workspace */}
          <div
            className={`flex-1 h-full ${
              activeConversation ? "flex" : "hidden md:flex"
            } flex-col`}
          >
            {activeConversation ? (
              <ConversationView
                conversation={activeConversation}
                currentUserId={currentUserId}
                allUsers={workspaceUsers}
                onBack={() => {
                  setActiveConversation(null);
                  activeConversationRef.current = null;
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("chandak:messenger-drawer-state", {
                        detail: { isOpen: true, activeConversationId: null },
                      })
                    );
                  }
                }}
                onConversationUpdated={loadData}
              />
            ) : (
              /* Empty State (WhatsApp Web Style) */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface/20 select-none">
                <div className="h-20 w-20 rounded-3xl bg-accent-soft flex items-center justify-center mb-4 shadow-sm">
                  <MessageSquareText className="h-10 w-10 text-accent" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  Chandak Messenger for Web
                </h2>
                <p className="text-xs text-muted max-w-sm mt-1.5 leading-relaxed">
                  Send and receive messages with your Chandak Workspace team in real-time. Start an individual 1-on-1 chat or create a project group.
                </p>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewChat(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-contrast hover:opacity-90 transition-opacity shadow-xs"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    <span>Start Direct Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewGroup(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    <span>Create Team Group</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showNewChat && (
          <NewChatModal
            users={workspaceUsers}
            currentUserId={currentUserId}
            onClose={() => setShowNewChat(false)}
            onConversationCreated={(newConv) => {
              setActiveConversation(newConv);
              loadData();
            }}
          />
        )}

        {showNewGroup && (
          <NewGroupModal
            users={workspaceUsers}
            currentUserId={currentUserId}
            onClose={() => setShowNewGroup(false)}
            onGroupCreated={(newConv) => {
              setActiveConversation(newConv);
              loadData();
            }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

