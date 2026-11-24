import React from "react";
import { notFound } from "next/navigation";
import { getMinutesReview } from "@/lib/actions/meet/review";
import MinutesReviewClient from "@/components/meet/MinutesReviewClient";
import TeamsImportCard from "@/components/meet/TeamsImportCard";

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
      {review.canEdit && !["mom_published", "published"].includes(review.session.status) && <TeamsImportCard sessionId={sessionId} />}
      <MinutesReviewClient review={review} />
    </>
  );
}
