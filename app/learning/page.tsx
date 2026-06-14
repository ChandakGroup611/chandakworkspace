"use client";

import LearningHubClient from "./LearningHubClient";
import { usePermissions } from "@/hooks/usePermissions";

export default function LearningHubPage() {
  const { hasPermission, roleCode } = usePermissions();
  const canView = roleCode === "SUPER_ADMIN" || hasPermission("LEARNING_VIEW");

  if (!canView) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view the Learning Hub.</p>
        </div>
      </div>
    );
  }

  return <LearningHubClient />;
}
