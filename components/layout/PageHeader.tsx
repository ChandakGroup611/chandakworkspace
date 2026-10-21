"use client";

import React from "react";
import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode; // Optional extra content below title
}

export function PageHeader({ 
  title, 
  description, 
  breadcrumbs,
  icon, 
  badge, 
  actions, 
  children 
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 mb-4 shrink-0">
      <div className="space-y-1 flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted mb-1 flex-wrap">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-muted/60 select-none">/</span>}
                {b.href ? (
                  <Link href={b.href} className="hover:text-foreground transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {icon && (
            <div className="shrink-0 text-muted">
              {icon}
            </div>
          )}
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-heading">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>

        {description && (
          <p className="text-sm text-subtle mt-0.5">
            {description}
          </p>
        )}

        {children}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
