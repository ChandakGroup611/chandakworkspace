"use client";

import React from "react";
import { ArrowLeft, RotateCcw, Save, RefreshCw } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

export interface TransactionFormLayoutProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  category?: string;
  icon: React.ElementType;
  iconBg?: string;
  description: string;
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
  onBack: () => void;
  backLabel: string;
  onReset?: () => void;
  onSave?: (e?: any) => void;
  saveLabel?: string;
  saveIcon?: React.ElementType;
  isSubmitting?: boolean;
  isSaveDisabled?: boolean;
  saveButton?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function TransactionFormLayout({
  title,
  badge,
  badgeColor,
  category,
  icon: Icon,
  iconBg,
  description,
  breadcrumbs,
  onBack,
  backLabel,
  onReset,
  onSave,
  saveLabel = "Save Record",
  saveIcon: SaveIcon,
  isSubmitting = false,
  isSaveDisabled = false,
  saveButton,
  headerActions,
  children
}: TransactionFormLayoutProps) {
  return (
    <div className="w-full flex-1 flex flex-col space-y-8 animate-in fade-in duration-200 min-w-0">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <AppButton
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{backLabel}</span>
            </AppButton>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                <span className="text-border text-xs">/</span>
                {bc.onClick ? (
                  <button
                    type="button"
                    onClick={bc.onClick}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    {bc.label}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${iconBg || "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 flex-wrap">
                <span>{title}</span>
                {badge && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor || "bg-theme-btn-primary/10 text-theme-btn-primary border-theme-btn-primary/20"}`}>
                    {badge}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center shrink-0">
          {headerActions}
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs h-9 px-4 font-semibold"
          >
            Cancel
          </AppButton>
          {onReset && (
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Form
            </AppButton>
          )}
          {saveButton ? (
            saveButton
          ) : onSave ? (
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              disabled={isSubmitting || isSaveDisabled}
              onClick={() => onSave()}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs px-5"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : SaveIcon ? (
                <SaveIcon className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saveLabel}</span>
            </AppButton>
          ) : null}
        </div>
      </div>

      {/* Transaction Canvas */}
      <div className="space-y-6 min-w-0">
        {children}
      </div>

      {/* Bottom Back & Action Flow */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 pb-12">
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-4 gap-1.5 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backLabel}</span>
        </AppButton>

        <div className="flex items-center gap-2.5 flex-wrap">
          {headerActions}
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs h-9 px-4 font-semibold"
          >
            Cancel
          </AppButton>
          {onReset && (
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Form
            </AppButton>
          )}
          {saveButton ? (
            saveButton
          ) : onSave ? (
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              disabled={isSubmitting || isSaveDisabled}
              onClick={() => onSave()}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs px-5"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : SaveIcon ? (
                <SaveIcon className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saveLabel}</span>
            </AppButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export interface WorkingDocumentLayoutProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  category?: string;
  icon: React.ElementType;
  iconBg?: string;
  description: string;
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
  onBack: () => void;
  backLabel: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function WorkingDocumentLayout({
  title,
  badge,
  badgeColor,
  category,
  icon: Icon,
  iconBg,
  description,
  breadcrumbs,
  onBack,
  backLabel,
  headerActions,
  children
}: WorkingDocumentLayoutProps) {
  return (
    <div className="w-full flex-1 flex flex-col space-y-8 animate-in fade-in duration-200 min-w-0">
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <AppButton
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{backLabel}</span>
            </AppButton>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                <span className="text-border text-xs">/</span>
                {bc.onClick ? (
                  <button
                    type="button"
                    onClick={bc.onClick}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    {bc.label}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${iconBg || "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 flex-wrap">
                <span>{title}</span>
                {badge && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor || "bg-theme-btn-primary/10 text-theme-btn-primary border-theme-btn-primary/20"}`}>
                    {badge}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center shrink-0">
          {headerActions}
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs h-9 px-4 gap-1.5 font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </AppButton>
        </div>
      </div>

      {/* Document Canvas */}
      <div className="space-y-6 min-w-0">
        {children}
      </div>

      {/* Bottom Back Flow */}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-6 pb-12">
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-4 gap-1.5 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backLabel}</span>
        </AppButton>

        <div className="flex items-center gap-2.5 flex-wrap">
          {headerActions}
        </div>
      </div>
    </div>
  );
}
