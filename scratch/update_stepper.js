const fs = require('fs');

let content = fs.readFileSync('app/requirements/[id]/page.tsx', 'utf8');

const regex = /\{activeTab === 'approval' && \([\s\S]*?(?=\{activeTab === 'tasks' && \()/m;
const match = content.match(regex);

if (match) {
  const newApproval = `
          {activeTab === 'approval' && (
            <div className="flex flex-col space-y-8 animate-in fade-in duration-300 pb-12">
              {approvalFlow.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 opacity-60 mt-4 border border-dashed border-border/80 rounded-2xl bg-surface/30 backdrop-blur-sm">
                  <Shield className="h-10 w-10 mb-3 text-accent/60" />
                  <p className="text-sm font-semibold text-muted">No approval workflow has been initiated yet.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(
                    approvalFlow.reduce((acc, flow) => {
                      const deptName = flow.department?.name || 'Unknown Department';
                      if (!acc[deptName]) acc[deptName] = [];
                      acc[deptName].push(flow);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([deptName, flows]: any) => (
                    <AppCard key={deptName} className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0">
                      <div className="bg-gradient-to-r from-amber-500/15 via-surface/90 to-surface/40 dark:from-amber-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-4 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-4 rounded-full bg-amber-500 shadow-xs" />
                          <Shield className="w-4.5 h-4.5 text-amber-500" />
                          <h3 className="font-bold text-[15px] tracking-wide text-foreground">{deptName} Workflow</h3>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="relative">
                          {/* Vertical Stepper Line */}
                          <div className="absolute top-4 left-[21px] bottom-4 w-0.5 bg-gradient-to-b from-border/80 via-border/40 to-transparent" />
                          
                          <div className="space-y-8 relative z-10">
                            {flows.map((flow: any) => {
                              const isApproved = flow.status === 'Approved' || flow.status === 'Bypassed';
                              const isPending = flow.status === 'Pending';
                              const isRejected = flow.status === 'Rejected';
                              
                              let bgStatus = "bg-surface dark:bg-surface/50";
                              let borderStatus = "border-border/60";
                              let textStatus = "text-muted";
                              let icon = <Clock className="h-4.5 w-4.5" />;
                              let ringStatus = "ring-border/20 dark:ring-white/5";
                              
                              if (isApproved) {
                                bgStatus = "bg-emerald-50/50 dark:bg-emerald-950/20";
                                borderStatus = "border-emerald-500/30";
                                textStatus = "text-emerald-600 dark:text-emerald-400";
                                icon = <CheckCircle className="h-4.5 w-4.5" />;
                                ringStatus = "ring-emerald-500/20";
                              } else if (isRejected) {
                                bgStatus = "bg-red-50/50 dark:bg-red-950/20";
                                borderStatus = "border-red-500/30";
                                textStatus = "text-red-600 dark:text-red-400";
                                icon = <XCircle className="h-4.5 w-4.5" />;
                                ringStatus = "ring-red-500/20";
                              } else if (isPending) {
                                bgStatus = "bg-amber-50/50 dark:bg-amber-950/20";
                                borderStatus = "border-amber-500/30";
                                textStatus = "text-amber-600 dark:text-amber-400";
                                icon = <AlertTriangle className="h-4.5 w-4.5" />;
                                ringStatus = "ring-amber-500/20";
                              }

                              return (
                                <div key={flow.id} className="flex gap-5 group">
                                  {/* Stepper Circle */}
                                  <div className={\`w-11 h-11 rounded-full flex items-center justify-center border-2 shrink-0 bg-background shadow-sm ring-4 \${ringStatus} \${borderStatus} \${textStatus} transition-transform group-hover:scale-110 duration-300\`}>
                                    {icon}
                                  </div>
                                  
                                  {/* Stepper Content */}
                                  <div className={\`flex-1 p-4.5 rounded-xl border \${borderStatus} \${bgStatus} shadow-xs hover:shadow-md transition-all duration-300\`}>
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1">Level {flow.level}</div>
                                        <div className="font-bold text-[15px] text-foreground">{flow.approver?.full_name || 'Unknown User'}</div>
                                      </div>
                                      <div className={\`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs \${isApproved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : isRejected ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : isPending ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-surface/80 text-muted'}\`}>
                                        {flow.status}
                                      </div>
                                    </div>
                                    {flow.actioned_at && (
                                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted mb-3 opacity-80">
                                        <Calendar className="w-3.5 h-3.5" /> {new Date(flow.actioned_at).toLocaleString()}
                                      </div>
                                    )}
                                    {flow.remarks && (
                                      <div className="mt-3 text-sm bg-background/50 dark:bg-[#050505]/50 p-3 rounded-lg text-foreground border border-border/40 italic leading-relaxed">
                                        <SafeHtml html={flow.remarks} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </AppCard>
                  ))}
                </div>
              )}
            </div>
          )}

        `;
  
  content = content.replace(regex, newApproval);
  fs.writeFileSync('app/requirements/[id]/page.tsx', content);
  console.log('Stepper updated');
} else {
  console.log('Stepper not found');
}
