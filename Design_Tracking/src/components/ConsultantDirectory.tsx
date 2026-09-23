"use client";

import React from "react";
import { ConsultantPartner } from "../types";
import { ConsultantMasterView } from "./masters/ConsultantMasterView";

interface ConsultantDirectoryProps {
  consultants?: ConsultantPartner[];
  onAddConsultant?: (consultant: Omit<ConsultantPartner, "id">) => void;
  onUpdateConsultant?: (id: string, updates: Partial<ConsultantPartner>) => void;
  onDeleteConsultant?: (id: string, reason?: string) => void;
  availableProjects?: string[];
  availableWorkPackages?: string[];
}

export const ConsultantDirectory: React.FC<ConsultantDirectoryProps> = () => {
  return <ConsultantMasterView />;
};
