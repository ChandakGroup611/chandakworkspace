import React from "react";
import { notFound } from "next/navigation";
import { getJoinContext } from "@/lib/actions/meet/join";
import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import JoinScreen from "@/components/meet/JoinScreen";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join meeting · Chandak Meet",
};

export default async function JoinMeetingPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const ctx = await getJoinContext(sessionId);
  if (!ctx) notFound();

  const { user } = await getCachedUser();
  let initials = "";
  if (user?.id) {
    const { data } = await supabaseAdmin.from("user_master").select("full_name").eq("id", user.id).maybeSingle();
    initials = String(data?.full_name || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return <JoinScreen ctx={ctx} initials={initials || "ME"} />;
}
