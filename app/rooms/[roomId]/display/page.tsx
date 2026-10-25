import React from "react";
import { notFound } from "next/navigation";
import { getRoomDisplayData } from "@/lib/actions/meet/rooms";
import RoomDisplayClient from "./RoomDisplayClient";

export async function generateMetadata({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const { room } = await getRoomDisplayData(roomId);
  return {
    title: room ? `${room.name} · Room Display Kiosk` : "Room Display Kiosk · Chandak Meet",
  };
}

export default async function RoomDisplayPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const displayData = await getRoomDisplayData(roomId);

  if (!displayData.room) {
    notFound();
  }

  return <RoomDisplayClient initialData={displayData} roomId={roomId} />;
}
