"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export type BreadcrumbItem = Crumb;

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  children?: React.ReactNode;
}

export function PageHeader({ title, description, icon, badge, actions, breadcrumbs, children }: PageHeaderProps) {
  return (
    <div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-muted">
              {breadcrumbs.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                  {c.href ? <Link href={c.href} prefetch={false} className="hover:text-foreground hover:underline">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                  {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden />}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          {icon && <span className="shrink-0 text-accent-soft-text">{icon}</span>}
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading leading-tight">{title}</h1>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {description && <p className="max-w-3xl text-[13.5px] text-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
    </div>
  );
}
