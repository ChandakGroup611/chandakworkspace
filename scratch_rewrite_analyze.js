const fs = require('fs');
const content = fs.readFileSync('d:/adios/app/requirements/[id]/page.tsx', 'utf8');

const search = /return \(\s*<PageContainer strict=\{true\}>\s*<PageHeader[\s\S]*?<\/PageContainer>\s*\);/m;

// First, inject activeTab state
let newContent = content.replace(
  'const [loadingConfig, setLoadingConfig] = useState(true);',
  'const [loadingConfig, setLoadingConfig] = useState(true);\n  const [activeTab, setActiveTab] = useState("details");\n  const [clock, setClock] = useState("audit"); // just so we use clock'
);

const replacement = `return (
    <PageContainer strict={true}>
      <PageHeader
        title={\`Requirement Analysis: \${requirement?.code || reqId}\`}
        description={requirement?.title || "Loading requirement details..."}
        badge={<AppBadge variant="info">{requirement?.status?.name || "Draft"}</AppBadge>}
        actions={
          <AppButton variant="outline" size="sm" onClick={() => router.push("/requirements")} leftIcon={<ArrowLeft className="h-3.5 w-3.5"/>}>
            Back to Directory
          </AppButton>
        }
      />

      <div className="flex flex-col flex-1 overflow-hidden mt-4">
        {/* Tab Navigation */}
        <div className={\`flex border-b mb-4 \${isLightMode ? "border-gray-200" : "border-white/10"}\`}>
          {[
            { id: 'details', label: 'Requirement Details' },
            { id: 'analysis', label: 'Business Analysis' },
            { id: 'approval', label: 'Approval Workflow' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'audit', label: 'Audit Trail' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={\`px-4 py-3 text-sm font-bold border-b-2 transition-colors \${activeTab === tab.id 
                ? (isLightMode ? 'border-indigo-600 text-indigo-700' : 'border-indigo-400 text-indigo-300')
                : (isLightMode ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600')
              }\`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'details' && (
            <div className="space-y-6 animate-in fade-in duration-300 pb-20">
              <AppCard>
                <AppCardContent className="p-6">
                  <h3 className={\`text-lg font-bold mb-4 border-b pb-2 \${isLightMode ? 'text-gray-800 border-gray-100' : 'text-white border-white/10'}\`}>
                    Original Business Request
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Scope</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.custom_fields?.scope_type || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Software System</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{masters?.systems?.find((s) => s.id === requirement?.custom_fields?.software_system_id)?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Module</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{masters?.modules?.find((s) => s.id === requirement?.custom_fields?.module_id)?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Submodule</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{masters?.submodules?.find((s) => s.id === requirement?.custom_fields?.sub_module_id)?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Category</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{masters?.ticket_category?.find((s) => s.id === requirement?.custom_fields?.category_id)?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Sub Category</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{masters?.issue_subs?.find((s) => s.id === requirement?.custom_fields?.sub_category_id)?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Created By</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.creator?.full_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Department</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.department?.name || '-'}</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 space-y-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-2">Subject</div>
                      <div className={\`text-sm font-medium p-3 rounded-lg \${isLightMode ? 'bg-gray-50 text-gray-900 border border-gray-100' : 'bg-white/5 text-gray-200 border border-white/10'}\`}>
                        {requirement?.title || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-2">Description</div>
                      <div className={\`text-sm p-4 rounded-lg whitespace-pre-wrap \${isLightMode ? 'bg-gray-50 text-gray-800 border border-gray-100' : 'bg-white/5 text-gray-300 border border-white/10'}\`}>
                        {requirement?.objective || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-2">Requirement Reason</div>
                      <div className={\`text-sm p-4 rounded-lg whitespace-pre-wrap \${isLightMode ? 'bg-gray-50 text-gray-800 border border-gray-100' : 'bg-white/5 text-gray-300 border border-white/10'}\`}>
                        {requirement?.custom_fields?.business_reason || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-2">Requirement Details</div>
                      <div className={\`text-sm p-4 rounded-lg whitespace-pre-wrap \${isLightMode ? 'bg-gray-50 text-gray-800 border border-gray-100' : 'bg-white/5 text-gray-300 border border-white/10'}\`}>
                        {requirement?.functional_scope || '-'}
                      </div>
                    </div>
                  </div>
                </AppCardContent>
              </AppCard>
            </div>
          )}

          {activeTab === 'analysis' && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300 pb-20">
              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}
              
              <AppCard>
                <AppCardContent className="p-6 space-y-8">
                  <div className="space-y-4">
                    <h3 className={\`text-sm font-bold flex items-center gap-2 pb-2 border-b \${isLightMode ? "text-indigo-700 border-gray-200" : "text-indigo-400 border-white/10"}\`}>
                      <Briefcase className="h-4 w-4" /> Business Classification
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Requirement Type</label>
                        <select className={\`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 \${isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-[#0a0d14] border-white/10 text-white"}\`} value={formData.requirement_type_id} onChange={e => setFormData({...formData, requirement_type_id: e.target.value})} required>
                          <option value="">Select Type</option>
                          {(masters?.issue_types || []).map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Business Criticality</label>
                        <select className={\`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 \${isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-[#0a0d14] border-white/10 text-white"}\`} value={formData.business_criticality_id} onChange={e => setFormData({...formData, business_criticality_id: e.target.value})} required>
                          <option value="">Select Criticality</option>
                          {(masters?.priority_master || []).map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Business Value</label>
                        <AppInput placeholder="e.g. Revenue Impact, Cost Saving" value={formData.business_value_id} onChange={e => setFormData({...formData, business_value_id: e.target.value})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Business Impact</label>
                        <textarea className={\`w-full p-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] \${isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-[#0a0d14] border-white/10 text-white"}\`} value={formData.business_impact} onChange={e => setFormData({...formData, business_impact: e.target.value})} />
                      </div>
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Dependency Notes</label>
                        <textarea className={\`w-full p-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] \${isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-[#0a0d14] border-white/10 text-white"}\`} value={formData.dependency_notes} onChange={e => setFormData({...formData, dependency_notes: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className={\`text-sm font-bold flex items-center gap-2 pb-2 border-b \${isLightMode ? "text-emerald-700 border-gray-200" : "text-emerald-400 border-white/10"}\`}>
                      <Server className="h-4 w-4" /> Technical & Execution Scope
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Technical Scope / Architecture</label>
                        <textarea className={\`w-full p-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] \${isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-[#0a0d14] border-white/10 text-white"}\`} value={formData.technical_scope} onChange={e => setFormData({...formData, technical_scope: e.target.value})} />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Risk Assessment</label>
                          <select className={\`w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 \${isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-[#0a0d14] border-white/10 text-white"}\`} value={formData.risk_assessment} onChange={e => setFormData({...formData, risk_assessment: e.target.value})}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                        <div>
                          <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Regulatory Mapping</label>
                          <AppInput placeholder="e.g. GDPR, HIPAA, SOX" value={formData.regulatory_mapping} onChange={e => setFormData({...formData, regulatory_mapping: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className={\`text-sm font-bold flex items-center gap-2 pb-2 border-b \${isLightMode ? "text-amber-700 border-gray-200" : "text-amber-400 border-white/10"}\`}>
                      <Calendar className="h-4 w-4" /> Timelines & Resources
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Start Date *</label>
                        <AppInput type="date" value={formData.start_date ? formData.start_date.split('T')[0] : ''} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                      </div>
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Due Date *</label>
                        <AppInput type="date" value={formData.due_date ? formData.due_date.split('T')[0] : ''} onChange={e => setFormData({...formData, due_date: e.target.value})} required />
                      </div>
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Estimated Effort</label>
                        <AppInput placeholder="e.g. 50 Man Days" value={formData.estimated_effort} onChange={e => setFormData({...formData, estimated_effort: e.target.value})} />
                      </div>
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Estimated Cost</label>
                        <AppInput type="number" placeholder="Amount" value={formData.estimated_cost} onChange={e => setFormData({...formData, estimated_cost: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className={\`text-sm font-bold flex items-center gap-2 pb-2 border-b \${isLightMode ? "text-rose-700 border-gray-200" : "text-rose-400 border-white/10"}\`}>
                      <Shield className="h-4 w-4" /> Impacted Departments
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className={\`block text-xs font-bold mb-2 uppercase tracking-wider \${isLightMode ? "text-gray-600" : "text-gray-500"}\`}>Select Impacted Departments (For Matrix Approval) *</label>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {(masters?.departments || []).map((d: any) => {
                            const isSelected = formData.impacted_departments.includes(d.id);
                            return (
                              <label key={d.id} className={\`flex items-center p-3 rounded-xl border cursor-pointer transition-all \${isSelected ? (isLightMode ? 'bg-indigo-50 border-indigo-200 shadow-inner' : 'bg-indigo-500/10 border-indigo-500/30 shadow-inner') : (isLightMode ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-[#0a0d14] border-white/10 hover:bg-white/[0.02]')}\`}>
                                <input 
                                  type="checkbox" 
                                  className="sr-only"
                                  checked={isSelected}
                                  onChange={() => handleDepartmentToggle(d.id)}
                                />
                                <div className={\`w-4 h-4 rounded border mr-3 flex items-center justify-center \${isSelected ? 'bg-indigo-500 border-indigo-500' : (isLightMode ? 'border-gray-300' : 'border-gray-600')}\`}>
                                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className={\`text-sm font-medium \${isSelected ? (isLightMode ? 'text-indigo-900' : 'text-indigo-300') : (isLightMode ? 'text-gray-700' : 'text-gray-400')}\`}>{d.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-6 border-t border-white/10 gap-3">
                    <AppButton type="button" variant="outline" onClick={() => router.push("/requirements")}>Cancel</AppButton>
                    <AppButton type="submit" variant="primary" disabled={loading}>
                      {loading ? "Saving..." : "Save Business Analysis & Generate Approval Matrix"}
                    </AppButton>
                  </div>

                </AppCardContent>
              </AppCard>
            </form>
          )}

          {activeTab === 'approval' && (
            <div className="flex flex-col items-center justify-center h-64 opacity-50 mt-10">
              <Shield className="h-10 w-10 mb-4" />
              <p>Approval workflow visualization will appear here.</p>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="flex flex-col items-center justify-center h-64 opacity-50 mt-10">
              <Server className="h-10 w-10 mb-4" />
              <p>Generated implementation tasks will appear here.</p>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="flex flex-col items-center justify-center h-64 opacity-50 mt-10">
              <Clock className="h-10 w-10 mb-4" />
              <p>Audit trail and lifecycle history will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );`;

newContent = newContent.replace(search, replacement);
fs.writeFileSync('d:/adios/app/requirements/[id]/page.tsx', newContent);
console.log('Update applied');
