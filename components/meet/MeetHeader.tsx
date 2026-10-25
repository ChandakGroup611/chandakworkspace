"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface MeetHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function MeetHeader({
  title,
  description,
  breadcrumbs,
  badge,
  actions,
  className,
}: MeetHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4", className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1.5 text-[12px] text-muted">
            <Link href="/meet" className="hover:text-foreground transition-colors">
              Chandak Meet
            </Link>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="h-3 w-3 text-muted/60" />
                {b.href ? (
                  <Link href={b.href} className="hover:text-foreground transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2.5">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-heading sm:text-[22px]">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-[13px] text-subtle">{description}</p>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
