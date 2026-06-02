const fs = require('fs');
let c = fs.readFileSync('d:/adios/components/tasks/TaskExecutionController.tsx', 'utf8');

c = c.replace(/const handleStatusTransition = \(action: "start" \| "resolve" \| "approve" \| "reopen"\) => \{[\s\S]*?\n  \};/, 
`const handleStatusTransition = async (action: "start" | "resolve" | "approve" | "reopen") => {
    if (action === "start") {
      setPendingStatus("ST_IN_PROGRESS");
    } else if (action === "resolve") {
      setPendingStatus("ST_RESOLVED");
    } else if (action === "approve") {
      setActionLoading(true);
      try {
        const { approveTask } = await import("@/lib/actions/tasks");
        await approveTask(taskId);
        await loadTaskDetails(true);
      } catch (e: any) {
        setError(e.message || "Failed to approve task.");
      } finally {
        setActionLoading(false);
      }
    } else if (action === "reopen") {
      setActionLoading(true);
      try {
        const { reopenTask } = await import("@/lib/actions/tasks");
        await reopenTask(taskId);
        await loadTaskDetails(true);
      } catch (e: any) {
        setError(e.message || "Failed to reopen task.");
      } finally {
        setActionLoading(false);
      }
    }
  };`);

c = c.replace(/const currentStatusCode = task\.status\?\.code \|\| "ST_OPEN";\n  const progressPercentage = task\.progress_percentage \|\| 0;/, 
`const currentStatusCode = task.status?.code || "ST_OPEN";
  const progressPercentage = task.progress_percentage || 0;

  const isFrozen = task.status?.is_closed;
  const canEdit = task.currentUserCanAct && !isFrozen;`);

c = c.replace(/value={pendingStatus \|\| currentStatusCode}\n              onChange=/g, 
`value={pendingStatus || currentStatusCode}
              disabled={!canEdit}
              onChange=`);

c = c.replace(/\{isReadOnly \? \(/g, `{isReadOnly || !canEdit ? (`);

c = c.replace(/<textarea\n            value=\{remarksDraft\}\n            onChange=\{e => setRemarksDraft\(e\.target\.value\)\}/g, 
`<textarea
            value={remarksDraft}
            onChange={e => setRemarksDraft(e.target.value)}
            disabled={!canEdit}`);

c = c.replace(/className=\{`w-full min-h-\[64px\] p-2 rounded-md text-\[13px\] border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors \$\{\n              isLightMode \? "bg-white border-gray-200 text-gray-900" : "bg-\[#0B0F19\] border-white\/10 text-white"\n            \}`\}\n            placeholder="Add update notes or handoff remarks\.\.\."/g, 
`className={\`w-full min-h-[64px] p-2 rounded-md text-[13px] border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors \${isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-[#0B0F19] border-white/10 text-white"} \${!canEdit ? "opacity-50 cursor-not-allowed" : ""}\`}
            placeholder={!canEdit ? "Task is frozen/read-only." : "Add update notes or handoff remarks..."}`);

c = c.replace(/<AppButton type="button" variant="primary" size="sm" onClick=\{handleBatchSave\} disabled=\{saveRemarksLoading\}>/g, 
`{canEdit && (
              <AppButton type="button" variant="primary" size="sm" onClick={handleBatchSave} disabled={saveRemarksLoading}>`);

c = c.replace(/Save Remarks"\}\n            <\/AppButton>/g, 
`Save Remarks"}
              </AppButton>
            )}`);

c = c.replace(/<form onSubmit=\{handleAddChecklist\} className="flex gap-2">/g, 
`{canEdit && (
            <form onSubmit={handleAddChecklist} className="flex gap-2">`);

c = c.replace(/<AppButton type="submit" variant="primary" size="sm" className="h-9 shrink-0"><Plus className="h-4 w-4"\/><\/AppButton>\n            <\/form>/g, 
`<AppButton type="submit" variant="primary" size="sm" className="h-9 shrink-0"><Plus className="h-4 w-4"/></AppButton>
            </form>
          )}`);

c = c.replace(/onClick=\{\(\) => handleToggleChecklist\(item\.id, item\.is_completed\)\}/g, 
`onClick={() => canEdit && handleToggleChecklist(item.id, item.is_completed)}`);

c = c.replace(/className=\{`flex items-center gap-3 p-2\.5 rounded-xl border transition-colors cursor-pointer \$\{/g, 
`className={\`flex items-center gap-3 p-2.5 rounded-xl border transition-colors \${canEdit ? "cursor-pointer" : "cursor-default opacity-80"} \${`);

c = c.replace(/\{currentStatusCode === "ST_OPEN" && \(/g, `{currentStatusCode === "ST_OPEN" && canEdit && (`);
c = c.replace(/\{currentStatusCode === "ST_IN_PROGRESS" && \(/g, `{currentStatusCode === "ST_IN_PROGRESS" && canEdit && (`);
c = c.replace(/\{currentStatusCode === "ST_RESOLVED" && \(/g, `{currentStatusCode === "ST_RESOLVED" && task.currentUserIsSuperAdmin && (`);
c = c.replace(/\{currentStatusCode === "ST_CLOSED" && \(/g, `{task.status?.is_closed && task.currentUserIsSuperAdmin && (`);

c = c.replace(/<button\n                    type="button"\n                    onClick=\{triggerFileSelect\}/g, 
`{canEdit && (
                    <button
                      type="button"
                      onClick={triggerFileSelect}`);

c = c.replace(/<Pin className="h-4 w-4" \/>\n                  <\/button>/g, 
`<Pin className="h-4 w-4" />
                    </button>
                  )}`);

c = c.replace(/<div \n                  onClick=\{triggerFileSelect\}/g, 
`{canEdit && (
                <div 
                  onClick={triggerFileSelect}`);

c = c.replace(/Supports any document or image file<\/span>\n                    <\/div>\n                  \)}\n                <\/div>/g, 
`Supports any document or image file</span>
                    </div>
                  )}
                </div>
              )}`);

fs.writeFileSync('d:/adios/components/tasks/TaskExecutionController.tsx', c);
console.log("Replaced successfully!");
