"use client";

import React from "react";
import TicketRealtimeChat from "@/components/tickets/TicketRealtimeChat";

interface TicketChatProps {
  ticket: any;
}

export function TicketChat({ ticket }: TicketChatProps) {
  const ticketId = ticket?.dbId || ticket?.id;
  if (!ticketId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted text-xs">
        No ticket ID found for collaboration chat.
      </div>
    );
  }

  return <TicketRealtimeChat ticketId={ticketId} />;
}

export default TicketChat;
