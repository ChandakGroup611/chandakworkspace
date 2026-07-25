const fs = require('fs');

const path = 'd:\\adios\\app\\masters\\vendors\\page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Imports
code = code.replace(
  /import { Building2, Search, Plus, Edit, Trash2, X, RefreshCw, FileText, Briefcase, Landmark, Settings } from "lucide-react";/,
  'import { Building2, Search, Plus, Edit, Trash2, X, RefreshCw, FileText, Briefcase, Landmark, Settings, Check } from "lucide-react";'
);

// 2. States
code = code.replace(
  /const \[formIndustryType, setFormIndustryType\] = useState\(""\);\n  const \[formVendorType, setFormVendorType\] = useState\(""\);/,
  `const [formIndustryType, setFormIndustryType] = useState("");
  const [formVendorType, setFormVendorType] = useState<string[]>([]);
  
  const [masterIndustryTypes, setMasterIndustryTypes] = useState<any[]>([]);
  const [masterVendorTypes, setMasterVendorTypes] = useState<any[]>([]);`
);

// 3. Fetch
code = code.replace(
  /useEffect\(\(\) => {\n    fetchVendors\(\);\n  }, \[\]\);/,
  `useEffect(() => {
    fetchVendors();
    fetchDependencies();
  }, []);

  const fetchDependencies = async () => {
    try {
      const [indRes, venRes] = await Promise.all([
        supabase.from("master_industry_types").select("*").eq("is_active", true).order("name"),
        supabase.from("master_vendor_types").select("*").eq("is_active", true).order("name")
      ]);
      if (indRes.data) setMasterIndustryTypes(indRes.data);
      if (venRes.data) setMasterVendorTypes(venRes.data);
    } catch (e) {
      console.error(e);
    }
  };`
);

// 4. resetForm
code = code.replace(
  /setFormIndustryType\(""\);\n    setFormVendorType\(""\);/,
  `setFormIndustryType("");
    setFormVendorType([]);`
);

// 5. handleOpenEdit
code = code.replace(
  /setFormIndustryType\(vendor\.industry_type \|\| ""\);\n    setFormVendorType\(vendor\.vendor_type \|\| ""\);/,
  `setFormIndustryType(vendor.industry_type || "");
    setFormVendorType(vendor.vendor_type ? vendor.vendor_type.split(",").map((s: string) => s.trim()) : []);`
);

// 6. handleSave
code = code.replace(
  /industry_type: formIndustryType\.trim\(\),\n        vendor_type: formVendorType\.trim\(\)/,
  `industry_type: formIndustryType.trim(),
        vendor_type: formVendorType.join(", ")`
);

// 7. Form UI
const oldUI = `<div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Industry Type</label>
                      <select value={formIndustryType} onChange={e => setFormIndustryType(e.target.value)} className="w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-accent focus:ring-accent/20 border">
                        <option value="">-- Select Industry --</option>
                        <option value="IT Software">IT Software</option>
                        <option value="IT Hardware / Electronics">IT Hardware / Electronics</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="BFSI (Banking, Financial Services, Insurance)">BFSI (Banking, Financial Services, Insurance)</option>
                        <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                        <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                        <option value="Telecommunications">Telecommunications</option>
                        <option value="Education & EdTech">Education & EdTech</option>
                        <option value="Construction & Real Estate">Construction & Real Estate</option>
                        <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                        <option value="Government & PSU">Government & PSU</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Vendor Type</label>
                      <select value={formVendorType} onChange={e => setFormVendorType(e.target.value)} className="w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-accent focus:ring-accent/20 border">
                        <option value="">-- Select Type --</option>
                        <option value="OEM (Original Equipment Manufacturer)">OEM (Original Equipment Manufacturer)</option>
                        <option value="Authorized Distributor">Authorized Distributor</option>
                        <option value="Value Added Reseller (VAR)">Value Added Reseller (VAR)</option>
                        <option value="System Integrator (SI)">System Integrator (SI)</option>
                        <option value="Managed Service Provider (MSP)">Managed Service Provider (MSP)</option>
                        <option value="Implementation Partner">Implementation Partner</option>
                        <option value="Consultant / Advisory">Consultant / Advisory</option>
                        <option value="Direct Retailer">Direct Retailer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>`;

const newUI = `<div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Industry Type</label>
                      <div className="flex gap-2">
                        <select value={formIndustryType} onChange={e => {
                          setFormIndustryType(e.target.value);
                          setFormVendorType([]);
                        }} className="flex-1 h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-accent focus:ring-accent/20 border">
                          <option value="">-- Select Industry --</option>
                          {masterIndustryTypes.map(ind => (
                            <option key={ind.id} value={ind.name}>{ind.name}</option>
                          ))}
                        </select>
                        <AppButton type="button" variant="outline" onClick={async () => {
                          const newInd = prompt("Enter new Industry Type:");
                          if (newInd && newInd.trim()) {
                            await saveMasterEntity("master_industry_types", { name: newInd.trim() });
                            await fetchDependencies();
                            setFormIndustryType(newInd.trim());
                            setFormVendorType([]);
                          }
                        }} className="h-11 w-11 px-0 shrink-0" title="Add New Industry">
                          <Plus className="h-4 w-4" />
                        </AppButton>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Vendor Type (Multi-Select)</label>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 min-h-[44px] p-2 rounded-xl border border-border bg-surface items-center">
                          {masterVendorTypes.filter(v => v.industry_name === formIndustryType).map(v => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                if (formVendorType.includes(v.name)) {
                                  setFormVendorType(formVendorType.filter(t => t !== v.name));
                                } else {
                                  setFormVendorType([...formVendorType, v.name]);
                                }
                              }}
                              className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 \${
                                formVendorType.includes(v.name)
                                  ? "bg-accent text-white shadow-sm"
                                  : "bg-black/5 dark:bg-white/5 text-foreground hover:bg-black/10 dark:hover:bg-white/10"
                              }\`}
                            >
                              {formVendorType.includes(v.name) && <Check className="h-3 w-3" />}
                              {v.name}
                            </button>
                          ))}
                          {!formIndustryType && (
                            <span className="text-xs text-gray-500 italic px-2">Please select an Industry Type first.</span>
                          )}
                          {formIndustryType && (
                             <AppButton type="button" variant="ghost" size="sm" onClick={async () => {
                               const newVen = prompt(\`Enter new Vendor Type for \${formIndustryType}:\`);
                               if (newVen && newVen.trim()) {
                                 await saveMasterEntity("master_vendor_types", { name: newVen.trim(), industry_name: formIndustryType });
                                 await fetchDependencies();
                                 setFormVendorType([...formVendorType, newVen.trim()]);
                               }
                             }} className="h-7 px-2 text-xs ml-auto text-accent hover:text-accent/80 hover:bg-accent/10">
                               <Plus className="h-3 w-3 mr-1" /> Add Type
                             </AppButton>
                          )}
                        </div>
                      </div>
                    </div>`;

code = code.replace(oldUI, newUI);

fs.writeFileSync(path, code);
console.log("Updated vendors page");
