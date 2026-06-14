const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

const imports = `
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchRequirements } from "@/lib/actions/requirements";
`;

if (!content.includes('import { AppCard')) {
  content = content.replace('import React, { useState, useEffect } from "react";', 'import React, { useState, useEffect } from "react";\n' + imports);
}

// Add prio lines
const prioLines = `
                  const prioId = r.custom_fields?.priority_id;
                  const prioName = masters?.priority?.find((x) => x.id === prioId)?.name || "-";
`;
if (!content.includes('const prioId =')) {
  content = content.replace('const scopeType = r.custom_fields?.scope_type || "-";', 'const scopeType = r.custom_fields?.scope_type || "-";' + prioLines);
}

// Define handleDelete if missing
if (!content.includes('const handleDelete = async')) {
  content = content.replace('const loadRequirements = async', 'const handleDelete = async (id: string) => {\n    // stub\n  };\n\n  const loadRequirements = async');
}

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
