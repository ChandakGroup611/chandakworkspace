const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wsId = params.get("workspaceId");
      if (wsId) {
        setActiveWorkspaceId(wsId);
        loadRequirements(wsId);
      }
    }
  }, []);`;

const newEffect = `  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wsId = params.get("workspaceId");
      if (wsId) {
        setActiveWorkspaceId(wsId);
      }
      loadRequirements(wsId || "");
    }
  }, []);`;

content = content.replace(oldEffect, newEffect);

const oldTh = '<th className="p-4 font-bold">Scope</th>';
const newTh = '<th className="p-4 font-bold">System</th>';
content = content.replace(oldTh, newTh);

const oldVars = 'const scopeType = r.custom_fields?.scope_type || "-";';
const newVars = `const sysId = r.custom_fields?.software_system_id;
                  const sysName = masters.systems?.find((x: any) => x.id === sysId)?.name || "-";`;
content = content.replace(oldVars, newVars);

const oldTd = '<span className={`text-xs ${isLightMode ? "text-gray-600" : "text-gray-400"}`}>{scopeType}</span>';
const newTd = '<span className={`text-xs ${isLightMode ? "text-gray-600" : "text-gray-400"}`}>{sysName}</span>';
content = content.replace(oldTd, newTd);

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
