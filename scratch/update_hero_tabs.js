const fs = require('fs');

let content = fs.readFileSync('app/requirements/[id]/page.tsx', 'utf8');

// 1. Replace Hero Header
const heroHeaderRegex = /<div className="flex items-center justify-between pb-2 mb-2 shrink-0 border-b border-border dark:border-white\/5">[\s\S]*?(?=<\/div>\s*<Dialog open=\{showAmendmentDialog\})/m;
const heroHeaderMatch = content.match(heroHeaderRegex);

if (heroHeaderMatch) {
  const newHeroHeader = `
      {/* 1. COMPACT HERO HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-5 shrink-0 border-b border-border">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] font-bold text-muted uppercase tracking-wider shadow-sm">
              {requirement.code || reqId}
            </span>
            <AppBadge variant="info" className="shadow-sm text-[11px] py-0.5">{requirement.approval_status || requirement.status?.name || "Draft"}</AppBadge>
            {requirement.priority && (
               <span className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-sm" style={{ backgroundColor: requirement.priority?.priority_color || '#ef4444' }}>
                 {requirement.priority?.name || requirement.priority?.priority_name}
               </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight truncate max-w-3xl leading-tight">
            {requirement.title || 'Untitled Subject'}
          </h1>
          <div className="flex items-center gap-4 text-xs font-medium text-muted mt-1">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 opacity-70"/> Created: {new Date(requirement.created_at).toLocaleDateString()}</span>
            {requirement.put_to_use_date && (
              <span className="flex items-center gap-1.5 text-accent"><CheckCircle className="w-3.5 h-3.5 opacity-70"/> Put to Use: {new Date(requirement.put_to_use_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <AppButton variant="outline" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-3.5 w-3.5"/>}>Back</AppButton>
          {!isViewMode && (isSuperAdmin || hasPermission('REQUIREMENTS_DELETE')) && (
            <AppButton variant="destructive" size="sm" leftIcon={<Trash2 className="h-4 w-4"/>} onClick={handleDelete}>
              Delete
            </AppButton>
          )}
          {!isViewMode && (requirement.approval_status === 'Approved' || requirement.approval_status === 'In Progress') && (
            <AppButton variant="primary" size="sm" leftIcon={<FilePlus className="h-4 w-4"/>} onClick={() => setShowWorkspaceSelector(true)}>
              Assign Task
            </AppButton>
          )}
          {!isViewMode && (requirement.approval_status === 'Approved' || requirement.approval_status === 'In Progress') && (isSuperAdmin || requirement.creator_id === currentUserId) && (
            <AppButton variant="secondary" size="sm" leftIcon={<Edit2 className="h-4 w-4"/>} onClick={() => setShowAmendmentDialog(true)}>
              Change Requirement
            </AppButton>
          )}
          {!isViewMode && (requirement.approval_status === 'Ready to Put to Use') && (
            <AppButton variant="primary" size="sm" leftIcon={<CheckCircle className="h-4 w-4"/>} onClick={() => setShowPutToUseDialog(true)}>
              Put to Use
            </AppButton>
          )}
        </div>
      </div>
  `.trim() + '\n';
  
  content = content.replace(heroHeaderRegex, newHeroHeader);
}

// 2. Replace Tabs
const tabsRegex = /\{\/\* Tab Navigation \*\/\}[\s\S]*?(?=<\/div>\s*\{\/\* TAB 1: Requirement Details \*\/})/m;
const tabsMatch = content.match(tabsRegex);

if (tabsMatch) {
  const newTabs = `
        {/* SEGMENTED CONTROL TABS */}
        <div className="flex p-1.5 rounded-xl bg-surface/50 border border-border/80 mb-6 shadow-sm overflow-x-auto hide-scrollbar select-none">
          {[
            { id: 'details', label: 'Requirement Details', icon: FileText },
            { id: 'analysis', label: 'Business Analysis', icon: Target },
            { id: 'approval', label: 'Approval Workflow', icon: Shield },
            { id: 'tasks', label: 'Tasks', icon: Briefcase, count: linkedTasks?.length },
            { id: 'audit', label: 'Audit Trail', icon: Clock, count: auditLogs?.length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={\`flex items-center justify-center gap-2 flex-1 min-w-[160px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 \${
                  isActive 
                    ? "bg-background text-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] border border-border/50" 
                    : "text-muted hover:text-foreground hover:bg-surface/60"
                }\`}
              >
                <Icon className={\`w-4 h-4 \${isActive ? "text-accent" : "text-muted opacity-70"}\`} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={\`ml-1.5 px-2 py-0.5 text-[10px] font-extrabold rounded-full \${
                    isActive ? "bg-accent/10 text-accent" : "bg-surface text-muted"
                  }\`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
  `.trim() + '\n';

  content = content.replace(tabsRegex, newTabs);
}

fs.writeFileSync('app/requirements/[id]/page.tsx', content);
console.log('Hero and Tabs updated!');
