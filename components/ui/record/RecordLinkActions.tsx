import React from "react";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Link version of <RowActions> for server-rendered lists (no click handlers needed).
 * Same 28px ghost icon buttons and the same order: View, Edit, then any extra links.
 */
const btn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export function RecordLinkActions({
  label,
  viewHref,
  editHref,
  canEdit = true,
  extra,
  className,
}: {
  label: string;
  viewHref?: string;
  editHref?: string;
  canEdit?: boolean;
  extra?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-0.5", className)}>
      {viewHref && (
        <Link href={viewHref} className={btn} aria-label={`View ${label}`} title="View">
          <Eye className="h-4 w-4" aria-hidden />
        </Link>
      )}
      {editHref && canEdit && (
        <Link href={editHref} className={btn} aria-label={`Edit ${label}`} title="Edit">
          <Pencil className="h-4 w-4" aria-hidden />
        </Link>
      )}
      {extra}
    </div>
  );
}
