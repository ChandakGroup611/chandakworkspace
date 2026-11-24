import React from "react";
import { notFound } from "next/navigation";
import { getMinutesReview } from "@/lib/actions/meet/review";
import MinutesReviewClient from "@/components/meet/MinutesReviewClient";
import TeamsImportCard from "@/components/meet/TeamsImportCard";
import MinutesAckPanel from "@/components/meet/MinutesAckPanel";
import BackLink from "@/components/meet/BackLink";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Review minutes · Chandak Meet",
};

export default async function MinutesReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const review = await getMinutesReview(sessionId);
  if (!review) notFound();
  return (
    <>
      <div className="mb-3"><BackLink href="/meet/minutes" label="Minutes" /></div>
      {review.canEdit && !["mom_published", "published"].includes(review.session.status) && <TeamsImportCard sessionId={sessionId} />}
      <MinutesReviewClient review={review} />
      <div className="mt-5"><MinutesAckPanel sessionId={sessionId} /></div>
    </>
  );
}
