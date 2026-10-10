"use client";

import LearningHubClient from "./LearningHubClient";
import { usePermissions } from "@/hooks/usePermissions";

export default function LearningHubPage() {
  const { hasPermission, roleCode } = usePermissions();
  const canView = true; // Accessible to all authenticated platform members as the central knowledge hub

  return <LearningHubClient />;
}
