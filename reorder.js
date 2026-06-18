const fs = require('fs');
let content = fs.readFileSync('app/users/page.tsx', 'utf-8');

const target = `<div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Full Name</label>
                    <input 
                      placeholder="e.g. Sarah Chen" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} required disabled={!isSuperAdmin}
                      className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">User Code</label>
                    <input 
                      placeholder="e.g. SC8839" value={formUserCode} onChange={(e) => setFormUserCode(e.target.value)} required disabled={!isSuperAdmin}
                      className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Email</label>
                    <input 
                      type="email" placeholder="e.g. sarah.chen@innovate.co" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required disabled={!isSuperAdmin}
                      className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Designation</label>
                    <div className="relative">
                      <select 
                        value={formDesigId} onChange={(e) => setFormDesigId(e.target.value)} disabled={!isSuperAdmin}
                        className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                      >
                        <option value="">Select Designation...</option>
                        {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Role</label>
                    <div className="relative">
                      <select 
                        value={formRoleId} onChange={(e) => setFormRoleId(e.target.value)} disabled={!isSuperAdmin}
                        className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                      >
                        <option value="">Select Role...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Manager</label>
                    <div className="relative">
                      <select 
                        value={formManagerId} onChange={(e) => setFormManagerId(e.target.value)} disabled={!isSuperAdmin}
                        className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                      >
                        <option value="">Michael Thompson</option>
                        {availableManagers.map(mgr => <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Department</label>
                    <div className="relative">
                      <select 
                        value={formDeptId} onChange={(e) => setFormDeptId(e.target.value)} disabled={!isSuperAdmin}
                        className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                      >
                        <option value="">Select Department...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-800">Assigned Hardware Assets</label>
                    <div className="min-h-[32px] p-1 rounded-lg border border-slate-300 bg-white shadow-sm flex flex-wrap items-center gap-1.5 relative">
                      {formAssignedAssets.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                        <span key={idx} className="text-sm px-2 py-0.5 flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                          [{tag}] <X className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => {
                            const currentArr = formAssignedAssets.split(',').map(x => x.trim()).filter(Boolean);
                            setFormAssignedAssets(currentArr.filter(x => x !== tag).join(', '));
                          }}/>
                        </span>
                      ))}
                      <div className="flex-1 min-w-[100px] relative">
                        <input type="text" className="w-full bg-transparent border-none outline-none text-sm px-2 text-slate-800 placeholder-slate-400" placeholder={!formAssignedAssets ? "Add asset..." : ""} />
                      </div>
                      <ChevronDown className="absolute right-2 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                </div>`;

const replacement = `<div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Full Name</label>
                    <input 
                      placeholder="e.g. Sarah Chen" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} required disabled={!isSuperAdmin}
                      className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">User Code</label>
                    <input 
                      placeholder="e.g. SC8839" value={formUserCode} onChange={(e) => setFormUserCode(e.target.value)} required disabled={!isSuperAdmin}
                      className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Email</label>
                    <input 
                      type="email" placeholder="e.g. sarah.chen@innovate.co" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required disabled={!isSuperAdmin}
                      className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Department</label>
                    <div className="relative">
                      <select 
                        value={formDeptId} 
                        onChange={(e) => {
                          setFormDeptId(e.target.value);
                          setFormDesigId("");
                        }} 
                        disabled={!isSuperAdmin}
                        className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                      >
                        <option value="">Select Department...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Designation</label>
                    <div className="relative">
                      <select 
                        value={formDesigId} onChange={(e) => setFormDesigId(e.target.value)} disabled={!isSuperAdmin || !formDeptId}
                        className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                      >
                        <option value="">{formDeptId ? "Select Designation..." : "Select Department First"}</option>
                        {designations
                          .filter(d => !formDeptId || d.department_id === formDeptId)
                          .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Role</label>
                    <div className="relative">
                      <select 
                        value={formRoleId} onChange={(e) => setFormRoleId(e.target.value)} disabled={!isSuperAdmin}
                        className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                      >
                        <option value="">Select Role...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800">Manager</label>
                    <div className="relative">
                      <select 
                        value={formManagerId} onChange={(e) => setFormManagerId(e.target.value)} disabled={!isSuperAdmin}
                        className="w-full h-8 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                      >
                        <option value="">Michael Thompson</option>
                        {availableManagers.map(mgr => <option key={mgr.id} value={mgr.id}>{mgr.full_name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-800">Assigned Hardware Assets</label>
                    <div className="min-h-[32px] p-1 rounded-lg border border-slate-300 bg-white shadow-sm flex flex-wrap items-center gap-1.5 relative">
                      {formAssignedAssets.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                        <span key={idx} className="text-sm px-2 py-0.5 flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                          [{tag}] <X className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => {
                            const currentArr = formAssignedAssets.split(',').map(x => x.trim()).filter(Boolean);
                            setFormAssignedAssets(currentArr.filter(x => x !== tag).join(', '));
                          }}/>
                        </span>
                      ))}
                      <div className="flex-1 min-w-[100px] relative">
                        <input type="text" className="w-full bg-transparent border-none outline-none text-sm px-2 text-slate-800 placeholder-slate-400" placeholder={!formAssignedAssets ? "Add asset..." : ""} />
                      </div>
                      <ChevronDown className="absolute right-2 top-2 h-4 w-4 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                </div>`;

if (!content.includes(target)) {
  console.log("Error: Target not found");
} else {
  content = content.replace(target, replacement);
  fs.writeFileSync('app/users/page.tsx', content);
  console.log("Success");
}
