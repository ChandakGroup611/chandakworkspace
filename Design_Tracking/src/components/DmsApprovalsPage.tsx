"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
import { DrawingItem } from "../types";
import { fetchFolderTreeAction } from "@/lib/actions/dms-core";
import { DmsQcQueueView } from "./DmsBinAndQcViews";
import { ApprovalsReviewQueue } from "./ApprovalsReviewQueue";

interface DmsApprovalsPageProps {
  drawings: DrawingItem[];
  onOpenReviewModal: (drawing: DrawingItem) => void;
}

export const DmsApprovalsPage: React.FC<DmsApprovalsPageProps> = ({
  drawings,
  onOpenReviewModal,
}) => {
  const router = useRouter();
  const [tab, setTab] = useState<"DOCUMENT" | "DRAWING">("DOCUMENT");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loadingWs, setLoadingWs] = useState(true);

  useEffect(() => {
    setLoadingWs(true);
    fetchFolderTreeAction()
      .then((res) => {
        const wsId = res.folders?.[0]?.workspaceId;
        if (res.success && wsId) {
          setWorkspaceId(wsId);
        }
      })
      .finally(() => setLoadingWs(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border px-4 py-3 rounded-xl shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Approval Queue</h2>
          <p className="text-xs text-muted-foreground">
            Manage Normal Document Approvals (DMS) and Drawing Register Approvals in one dedicated workspace.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-sunken p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setTab("DOCUMENT")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              tab === "DOCUMENT"
                ? "bg-surface text-primary shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Normal Document Approval</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("DRAWING")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              tab === "DRAWING"
                ? "bg-surface text-primary shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Drawing Approval</span>
          </button>
        </div>
      </div>

      {tab === "DOCUMENT" ? (
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          {loadingWs ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading document approval queue…</p>
          ) : !workspaceId ? (
            <p className="py-8 text-center text-xs text-muted-foreground">DMS workspace not initialized.</p>
          ) : (
            <DmsQcQueueView
              workspaceId={workspaceId}
              onChanged={() => {}}
              onOpen={(item) => {
                router.push(`/design/dms?doc=${encodeURIComponent(item.documentId)}&folder=${encodeURIComponent(item.folderId)}`);
              }}
            />
          )}
        </div>
      ) : (
        <ApprovalsReviewQueue drawings={drawings} onOpenReviewModal={onOpenReviewModal} />
      )}
    </div>
  );
};
