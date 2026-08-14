const fs = require('fs');
const modalPath = 'd:/adios/components/requirements/RequirementAnalysisModal.tsx';
let m = fs.readFileSync(modalPath, 'utf8');

// 1. Add fields to formData
const newFields = `    requirement_domain: "General Business",
    target_system: "",
    integrations: "",
    data_privacy: "",
    software_cost: "",
    dev_cost: "",
    target_environment: "",
    hardware_needs: "",
    capex_amount: "",
    opex_amount: "",`;
m = m.replace(/business_impact: "",/, newFields + '\n    business_impact: "",');

// 2. Add requirement_domain dropdown to Business Classification
const domainDropdown = `
              <div className="grid grid-cols-1 mb-4">
                <div>
                  <label className={labelClass}>Requirement Domain (Scope) <span className="text-red-500">*</span></label>
                  <select className={inputClass} value={formData.requirement_domain} onChange={e => setFormData({...formData, requirement_domain: e.target.value})} required>
                    <option value="General Business">General Business</option>
                    <option value="IT & Software System">IT & Software System</option>
                    <option value="Infrastructure & Hardware">Infrastructure & Hardware</option>
                  </select>
                </div>
              </div>
`;
m = m.replace(/<div className="grid grid-cols-1 md:grid-cols-3 gap-4">/, domainDropdown + '\n              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">');

// 3. Conditional rendering for IT & Infra sections
const conditionalBlocks = `
            {/* IT System Conditional Section */}
            {formData.requirement_domain === "IT & Software System" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className={\`theme-label flex items-center gap-2 pb-2 border-b text-blue-700 border-border\`}>
                  <Server className="h-4 w-4" /> IT & Software System Scope
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Target System / Application</label>
                    <AppInput placeholder="e.g. Internal ERP, CRM" value={formData.target_system} onChange={e => setFormData({...formData, target_system: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Data Privacy & Security</label>
                    <AppInput placeholder="e.g. Handles PII, Needs Security Audit" value={formData.data_privacy} onChange={e => setFormData({...formData, data_privacy: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Integration Dependencies</label>
                  <textarea className={textareaClass} value={formData.integrations} onChange={e => setFormData({...formData, integrations: e.target.value})} placeholder="Describe API or 3rd party integrations..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Software License Cost</label>
                    <AppInput type="number" placeholder="e.g. 1500" value={formData.software_cost} onChange={e => setFormData({...formData, software_cost: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Development Cost</label>
                    <AppInput type="number" placeholder="e.g. 5000" value={formData.dev_cost} onChange={e => setFormData({...formData, dev_cost: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Infrastructure Conditional Section */}
            {formData.requirement_domain === "Infrastructure & Hardware" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className={\`theme-label flex items-center gap-2 pb-2 border-b text-indigo-700 border-border\`}>
                  <Server className="h-4 w-4" /> Infrastructure Scope
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Target Environment / Data Center</label>
                    <AppInput placeholder="e.g. AWS, Azure, On-Premise" value={formData.target_environment} onChange={e => setFormData({...formData, target_environment: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Hardware & Capacity Needs</label>
                    <AppInput placeholder="e.g. 2TB Storage, 32GB RAM" value={formData.hardware_needs} onChange={e => setFormData({...formData, hardware_needs: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CAPEX Amount (Capital Expenditure)</label>
                    <AppInput type="number" placeholder="e.g. 10000" value={formData.capex_amount} onChange={e => setFormData({...formData, capex_amount: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>OPEX Amount (Recurring / Ops)</label>
                    <AppInput type="number" placeholder="e.g. 500" value={formData.opex_amount} onChange={e => setFormData({...formData, opex_amount: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>
            )}
`;

m = m.replace(/\{\/\* Governance & Dependency \*\/\}/, conditionalBlocks + '\n            {/* Governance & Dependency */}');

// 4. Update Budget Impact field (which is currently just a textarea, we want it explicitly labelled)
// wait, it is already a textarea on line 235:
// <label className={labelClass}>Business Impact</label>
// <textarea className={textareaClass} value={formData.business_impact} onChange={e => setFormData({...formData, business_impact: e.target.value})} />
const budgetImpactHtml = `
                <div>
                  <label className={labelClass}>Budget Impact</label>
                  <AppInput placeholder="e.g. Unbudgeted, Q3 Budget Allocation" value={formData.budget_impact} onChange={e => setFormData({...formData, budget_impact: e.target.value})} className={inputClass} />
                </div>
`;
m = m.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-4">\s*<div>\s*<label className={labelClass}>Business Objective <span className="text-red-500">\*<\/span><\/label>/, 
  `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Business Objective <span className="text-red-500">*</span></label>`);

m = m.replace(/<textarea className=\{textareaClass\} value=\{formData\.business_impact\} onChange=\{e => setFormData\(\{\.\.\.formData, business_impact: e\.target\.value\}\)\} \/>\s*<\/div>\s*<\/div>/,
  `<textarea className={textareaClass} value={formData.business_impact} onChange={e => setFormData({...formData, business_impact: e.target.value})} />
                </div>${budgetImpactHtml}              </div>`);

fs.writeFileSync(modalPath, m, 'utf8');

console.log('Updated RequirementAnalysisModal.tsx');
