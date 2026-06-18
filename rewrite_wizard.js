const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

// I will extract each field block. This requires manual regex or string indexOf to be precise.

function getBlock(startStr, endStr) {
  const start = code.indexOf(startStr);
  if (start === -1) throw new Error("Could not find start: " + startStr);
  
  let depth = 0;
  let end = -1;
  for (let i = start; i < code.length; i++) {
    if (code.substr(i, 4) === '<div') depth++;
    else if (code.substr(i, 5) === '</div') depth--;
    
    if (depth === 0) {
      end = i + 6; // include </div>
      break;
    }
  }
  return code.substring(start, end);
}

try {
  // 1. Template Selector (Header)
  const templateSelector = `<div className="flex items-center gap-2 mb-2.5 justify-between">` + code.substring(code.indexOf('<div className="flex items-center gap-2 mb-2.5 justify-between">') + 64, code.indexOf('</div>\n            <div className="grid grid-cols-2 gap-3">')) + `</div>`;
  
  // 2. Title & Code
  const titleBlock = code.substring(code.indexOf('<div className="grid grid-cols-2 gap-3">'), code.indexOf('<div className="mt-3 space-y-1.5">'));
  
  // 3. Link
  const linkBlock = getBlock('<div className="mt-3 space-y-1.5">', '</div>');
  
  // 4. Start Date
  const startDateStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date';
  const startDateStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(startDateStr));
  let depth = 0; let startDateEnd = -1;
  for(let i=startDateStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){startDateEnd=i+6; break;}
  }
  const startDateBlock = code.substring(startDateStart, startDateEnd);

  // 5. Due Date
  const dueDateStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Due Date';
  const dueDateStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(dueDateStr));
  depth = 0; let dueDateEnd = -1;
  for(let i=dueDateStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){dueDateEnd=i+6; break;}
  }
  const dueDateBlock = code.substring(dueDateStart, dueDateEnd);

  // 6. Execution Notes
  const execNotesStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Execution Notes (Rich Text)';
  const execNotesStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(execNotesStr));
  depth = 0; let execNotesEnd = -1;
  for(let i=execNotesStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){execNotesEnd=i+6; break;}
  }
  const execNotesBlock = code.substring(execNotesStart, execNotesEnd);

  // 7. Parent Task Link
  const parentTaskStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parent Task Link';
  const parentTaskStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(parentTaskStr));
  depth = 0; let parentTaskEnd = -1;
  for(let i=parentTaskStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){parentTaskEnd=i+6; break;}
  }
  const parentTaskBlock = code.substring(parentTaskStart, parentTaskEnd);

  // 8. Sprint
  const sprintStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assign to Sprint';
  const sprintStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(sprintStr));
  depth = 0; let sprintEnd = -1;
  for(let i=sprintStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){sprintEnd=i+6; break;}
  }
  const sprintBlock = code.substring(sprintStart, sprintEnd);

  // 9. Task Priority
  const priorityStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Priority';
  const priorityStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(priorityStr));
  depth = 0; let priorityEnd = -1;
  for(let i=priorityStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){priorityEnd=i+6; break;}
  }
  const priorityBlock = code.substring(priorityStart, priorityEnd);

  // 10. Department
  const deptStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department Field';
  const deptStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(deptStr));
  depth = 0; let deptEnd = -1;
  for(let i=deptStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){deptEnd=i+6; break;}
  }
  const deptBlock = code.substring(deptStart, deptEnd);

  // 11. Task Status
  const statusStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Status';
  const statusStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(statusStr));
  depth = 0; let statusEnd = -1;
  for(let i=statusStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){statusEnd=i+6; break;}
  }
  const statusBlock = code.substring(statusStart, statusEnd);

  // 12. Assignment & Execution
  const assignStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assignees';
  const assignStart = code.lastIndexOf('<div className="space-y-1.5">', code.indexOf(assignStr));
  depth = 0; let assignEnd = -1;
  for(let i=assignStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){assignEnd=i+6; break;}
  }
  const assignBlock = code.substring(assignStart, assignEnd);

  // 13. Tags & Labels
  const tagsStr = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tags & Labels';
  const tagsStart = code.lastIndexOf('<div className="space-y-1.5 mt-3">', code.indexOf(tagsStr));
  depth = 0; let tagsEnd = -1;
  for(let i=tagsStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){tagsEnd=i+6; break;}
  }
  const tagsBlock = code.substring(tagsStart, tagsEnd);

  // 14. Tasks & Assets (Checklist)
  const checklistStr = '<h4 className={`text-[11px] font-bold uppercase tracking-wider ${"text-foreground"}`}>Tasks & Assets</h4>';
  const checklistStart = code.lastIndexOf('<div className="mb-3">', code.indexOf(checklistStr));
  depth = 0; let checklistEnd = -1;
  for(let i=checklistStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){checklistEnd=i+6; break;}
  }
  let checklistBlock = code.substring(checklistStart, checklistEnd);
  checklistBlock = checklistBlock.replace('Tasks & Assets', 'Checklist');

  // 15. Attachments
  const attStr = '<h4 className={`text-[11px] font-bold uppercase tracking-wider ${"text-foreground"}`}>Attachments</h4>';
  // Attachments is inside a div.
  const attStart = code.lastIndexOf('<div>', code.indexOf(attStr));
  depth = 0; let attEnd = -1;
  for(let i=attStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){attEnd=i+6; break;}
  }
  const attBlock = code.substring(attStart, attEnd);

  // 16. Custom Fields
  const customStr = 'No extended properties configured for this task.'; // Wait, I removed this.
  // The custom fields block is the whole Section 5.
  const customSectionStart = code.indexOf('{/* Section 5: Extended Properties */}');
  const customTitleStart = code.indexOf('<div className="flex items-center justify-between mb-3">', customSectionStart);
  let customTitleEnd = -1;
  depth = 0;
  for(let i=customTitleStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){customTitleEnd=i+6; break;}
  }
  const customTitleBlock = code.substring(customTitleStart, customTitleEnd);
  
  const customGridStart = code.indexOf('<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">', customSectionStart);
  depth = 0; let customGridEnd = -1;
  for(let i=customGridStart; i<code.length; i++){
    if(code.substr(i,4)==='<div') depth++;
    if(code.substr(i,5)==='</div') depth--;
    if(depth===0){customGridEnd=i+6; break;}
  }
  const customGridBlock = code.substring(customGridStart, customGridEnd);

  const customFieldFormStr = '<div className={`p-3 rounded-lg border mb-3 flex flex-col sm:flex-row items-end gap-3';
  const customFieldFormStart = code.indexOf(customFieldFormStr, customSectionStart);
  let customFieldFormBlock = "";
  if (customFieldFormStart !== -1 && customFieldFormStart < customGridStart) {
    depth = 0; let customFieldFormEnd = -1;
    for(let i=customFieldFormStart; i<code.length; i++){
      if(code.substr(i,4)==='<div') depth++;
      if(code.substr(i,5)==='</div') depth--;
      if(depth===0){customFieldFormEnd=i+6; break;}
    }
    customFieldFormBlock = code.substring(customFieldFormStart, customFieldFormEnd);
  }

  // Construct New Layout
  const newLayout = `
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* LEFT COLUMN */}
          <div className="md:col-span-7 space-y-5">
            <div className={\`p-4 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Core Details</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 justify-between">
                  <div className="flex-1 max-w-sm">
                    <select
                      className={\`w-full p-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
                        isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                      }\`}
                      value={templateId}
                      onChange={e => setTemplateId(e.target.value)}
                    >
                      <option value="">-- Apply a Task Template --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.template_name}</option>
                      ))}
                    </select>
                  </div>
                  <AppButton variant="ghost" className="p-1.5 h-auto text-xs" onClick={() => setIsTemplateManagerOpen(true)}>
                    Manage Templates
                  </AppButton>
                </div>
                \${titleBlock}
                \${linkBlock}
              </div>
            </div>

            <div className={\`p-4 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}\`}>
                  <CalendarDays className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Timeline</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                \${startDateBlock}
                \${dueDateBlock}
              </div>
              <div className="grid grid-cols-2 gap-4">
                \${parentTaskBlock}
                \${sprintBlock}
              </div>
            </div>

            <div className={\`p-4 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}\`}>
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Execution Notes</h3>
              </div>
              \${execNotesBlock}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="md:col-span-5 space-y-5">
            <div className={\`p-4 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"}\`}>
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Classification</h3>
              </div>
              <div className="space-y-4">
                \${priorityBlock}
                \${deptBlock}
                \${statusBlock}
              </div>
            </div>

            <div className={\`p-4 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}\`}>
                  <Users className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Assignment & Tags</h3>
              </div>
              <div className="space-y-4">
                \${assignBlock}
                \${tagsBlock}
              </div>
            </div>

            <div className={\`p-4 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-rose-100 text-rose-600" : "bg-rose-500/20 text-rose-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Checklist & Assets</h3>
              </div>
              <div className="space-y-4">
                \${checklistBlock}
                \${attBlock}
              </div>
            </div>

            <div className={\`p-4 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              \${customTitleBlock}
              {isAddingField && ( \${customFieldFormBlock} )}
              \${customGridBlock}
            </div>
          </div>
        </div>
  `;

  const mainWrapperStart = code.indexOf('<div className="space-y-3">');
  const shellEnd = code.lastIndexOf('</EnterpriseWizardShell>');

  let preWrapper = code.substring(0, mainWrapperStart);
  let postWrapper = code.substring(shellEnd);

  const finalCode = preWrapper + newLayout + postWrapper;
  fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', finalCode);
  console.log("Success! File rewritten.");
} catch(e) {
  console.error("Error: ", e.message);
}
