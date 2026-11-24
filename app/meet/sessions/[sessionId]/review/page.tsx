import React from "react";
import { notFound } from "next/navigation";
import { getMinutesReview } from "@/lib/actions/meet/review";
import MinutesReviewClient from "@/components/meet/MinutesReviewClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Review minutes · Chandak Meet",
};

export default async function MinutesReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const review = await getMinutesReview(sessionId);
  if (!review) notFound();
  return <MinutesReviewClient review={review} />;
}
