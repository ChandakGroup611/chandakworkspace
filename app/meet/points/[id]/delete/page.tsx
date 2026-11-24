import React from "react";
import { notFound } from "next/navigation";
import BackLink from "@/components/meet/BackLink";
import { getPointRefs } from "@/lib/actions/meet/delete-refs";
import PointDeleteClient from "./PointDeleteClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delete point · Chandak Meet" };

export default async function DeletePointPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const refs = await getPointRefs(id);
  if (!refs.point) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-6">
      <div className="space-y-2 border-b border-border pb-4">
        <BackLink href={`/meet/points/${id}`} label="Back to the point" />
        <h1 className="text-[22px] font-bold text-heading">Delete {refs.point.code} "{refs.point.title}"</h1>
        <p className="text-[13.5px] text-muted">Check what is linked to this point before it goes.</p>
      </div>
      <PointDeleteClient refs={refs} />
    </div>
  );
}
