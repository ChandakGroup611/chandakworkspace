import React from "react";
import { notFound } from "next/navigation";
import { getJoinContext } from "@/lib/actions/meet/join";
import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import JoinScreen from "@/components/meet/JoinScreen";
import MyBriefPanel from "@/components/meet/MyBriefPanel";
import { getMyBrief } from "@/lib/actions/meet/my-brief";
import InviteReplyButtons from "@/components/meet/InviteReplyButtons";

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

  const brief = await getMyBrief(sessionId).catch(() => null);
  return (
    <div className="space-y-5">
      {brief?.myReply && ctx.status === "scheduled" && (
        <section className="theme-card-structural flex flex-wrap items-center justify-between gap-3 p-4" aria-labelledby="reply-h">
          <div className="min-w-0">
            <h2 id="reply-h" className="text-[15px] font-semibold text-heading">
              {brief.myReply === "accepted" ? "You've accepted this meeting" : brief.myReply === "declined" ? "You said you can't attend" : "Please reply to the invite"}
            </h2>
            <p className="text-[13px] text-subtle">
              {brief.myReply === "accepted"
                ? "The organiser sees you as attending. Join when it starts."
                : "Accept so the organiser knows you're coming. Joining also counts as accepting."}
            </p>
          </div>
          <InviteReplyButtons sessionId={sessionId} reply={brief.myReply} />
        </section>
      )}
      <JoinScreen ctx={ctx} initials={initials || "ME"} />
      {brief && <MyBriefPanel brief={brief} />}
    </div>
  );
}
