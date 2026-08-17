const fs = require('fs');

function updateWizard() {
  const wizardPath = 'd:/adios/components/tickets/TicketCreationWizard.tsx';
  let w = fs.readFileSync(wizardPath, 'utf8');

  // Inject the extra fields into reqPayload.custom_fields
  const customFieldsReplacement = `custom_fields: {
            ...payload,
            business_reason: data.business_reason,
            requirement_domain: data.requirement_domain || null,
            target_system: data.target_system || null,
            integrations: data.integrations || null,
            data_privacy: data.data_privacy || null,
            software_cost: data.software_cost || null,
            dev_cost: data.dev_cost || null,
            target_environment: data.target_environment || null,
            hardware_needs: data.hardware_needs || null,
            capex_amount: data.capex_amount || null,
            opex_amount: data.opex_amount || null,
            budget_impact: data.budget_impact || null
          }`;
          
  w = w.replace(/custom_fields:\s*\{\s*\.\.\.payload,\s*business_reason:\s*data\.business_reason\s*\}/, customFieldsReplacement);
  
  fs.writeFileSync(wizardPath, w, 'utf8');
  console.log('Updated TicketCreationWizard.tsx');
}

function updateForm(formPath, formName) {
  let f = fs.readFileSync(formPath, 'utf8');

  // Add the fields to formData
  const formDataReplacement = `business_reason: "",
    requirement_description: "",
    requirement_domain: "General Business",
    target_system: "",
    integrations: "",
    data_privacy: "",
    software_cost: "",
    dev_cost: "",
    target_environment: "",
    hardware_needs: "",
    capex_amount: "",
    opex_amount: "",
    budget_impact: "",`;
    
  f = f.replace(/business_reason: "",\s*requirement_description: "",/, formDataReplacement);

  const uiFields = `
              <div className="space-y-2 mt-4 pt-4 border-t border-theme-btn-primary/20">
                <label className={\`text-sm font-bold uppercase tracking-wider text-muted\`}>Requirement Domain (Scope) <span className="text-red-500">*</span></label>
                <select 
                  className={\`w-full p-4 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 \${"theme-card-structural text-foreground"}\`}
                  value={formData.requirement_domain}
                  onChange={(e) => setFormData(prev => ({...prev, requirement_domain: e.target.value}))}
                  required
                >
                  <option value="General Business">General Business</option>
                  <option value="IT & Software System">IT & Software System</option>
                  <option value="Infrastructure & Hardware">Infrastructure & Hardware</option>
                </select>
              </div>

              {formData.requirement_domain === "IT & Software System" && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-300 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                  <h5 className="font-bold text-blue-500">IT & Software System Scope</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>Target System / Application</label>
                      <input type="text" className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground\`} value={formData.target_system} onChange={e => setFormData(p => ({...p, target_system: e.target.value}))} placeholder="e.g. ERP, CRM" />
                    </div>
                    <div className="space-y-2">
                      <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>Data Privacy & Security</label>
                      <input type="text" className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground\`} value={formData.data_privacy} onChange={e => setFormData(p => ({...p, data_privacy: e.target.value}))} placeholder="e.g. Handles PII" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>Integration Dependencies</label>
                    <textarea className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground min-h-[60px]\`} value={formData.integrations} onChange={e => setFormData(p => ({...p, integrations: e.target.value}))} placeholder="List APIs or 3rd party tools..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>Software License Cost</label>
                      <input type="number" className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground\`} value={formData.software_cost} onChange={e => setFormData(p => ({...p, software_cost: e.target.value}))} placeholder="e.g. 1500" />
                    </div>
                    <div className="space-y-2">
                      <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>Development Cost</label>
                      <input type="number" className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground\`} value={formData.dev_cost} onChange={e => setFormData(p => ({...p, dev_cost: e.target.value}))} placeholder="e.g. 5000" />
                    </div>
                  </div>
                </div>
              )}

              {formData.requirement_domain === "Infrastructure & Hardware" && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-300 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/20">
                  <h5 className="font-bold text-indigo-500">Infrastructure Scope</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>Target Environment</label>
                      <input type="text" className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground\`} value={formData.target_environment} onChange={e => setFormData(p => ({...p, target_environment: e.target.value}))} placeholder="e.g. AWS, Azure" />
                    </div>
                    <div className="space-y-2">
                      <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>Hardware & Capacity</label>
                      <input type="text" className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground\`} value={formData.hardware_needs} onChange={e => setFormData(p => ({...p, hardware_needs: e.target.value}))} placeholder="e.g. 2TB Storage" />
                    </div>
                    <div className="space-y-2">
                      <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>CAPEX Amount</label>
                      <input type="number" className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground\`} value={formData.capex_amount} onChange={e => setFormData(p => ({...p, capex_amount: e.target.value}))} placeholder="e.g. 10000" />
                    </div>
                    <div className="space-y-2">
                      <label className={\`text-xs font-bold uppercase tracking-wider text-muted\`}>OPEX Amount</label>
                      <input type="number" className={\`w-full p-3 rounded-xl text-sm theme-card-structural text-foreground\`} value={formData.opex_amount} onChange={e => setFormData(p => ({...p, opex_amount: e.target.value}))} placeholder="e.g. 500" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-4">
                <label className={\`text-sm font-bold uppercase tracking-wider text-muted\`}>Budget Impact</label>
                <input type="text" className={\`w-full p-4 rounded-2xl text-sm theme-card-structural text-foreground\`} value={formData.budget_impact} onChange={e => setFormData(p => ({...p, budget_impact: e.target.value}))} placeholder="e.g. Unbudgeted, Approved in Q3" />
              </div>
`;

  f = f.replace(/onChange=\{\(e\) => setFormData\(prev => \(\{ \.\.\.prev, requirement_description: e\.target\.value \}\)\)\}\s*required\s*\/>\s*<\/div>/, 
    `onChange={(e) => setFormData(prev => ({ ...prev, requirement_description: e.target.value }))}
                required
              />
            </div>
            ${uiFields}`);
            
  fs.writeFileSync(formPath, f, 'utf8');
  console.log('Updated', formName);
}

try {
  updateWizard();
  updateForm('d:/adios/components/tickets/TicketFormERP.tsx', 'TicketFormERP');
  updateForm('d:/adios/components/tickets/TicketFormInfra.tsx', 'TicketFormInfra');
  updateForm('d:/adios/components/tickets/TicketFormOthers.tsx', 'TicketFormOthers');
} catch (e) {
  console.error(e);
}
