const fs = require('fs');

const path = 'd:\\adios\\app\\amc\\page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Imports
code = code.replace(
  /PieChart\n\} from "lucide-react";/,
  'PieChart,\n  Check\n} from "lucide-react";'
);

// 2. States
code = code.replace(
  /const \[formIndustryType, setFormIndustryType\] = useState\(""\);\n  const \[formVendorType, setFormVendorType\] = useState\(""\);/,
  `const [formIndustryType, setFormIndustryType] = useState("");
  const [formVendorType, setFormVendorType] = useState<string[]>([]);
  
  const [masterIndustryTypes, setMasterIndustryTypes] = useState<any[]>([]);
  const [masterVendorTypes, setMasterVendorTypes] = useState<any[]>([]);`
);

// 3. fetchDependencies
const oldFetch = `const [{ data: usersData }, { data: deptsData }, { data: citiesData }, { data: vendorsData }, { data: contractTypesData }] = await Promise.all([
        supabase.from("user_master").select("id, full_name, email").eq("is_active", true),
        supabase.from("departments").select("id, name").eq("is_active", true),
        supabase.from("master_cities").select("*").order("city_name"),
        supabase.from("vendor_master").select("*").order("name"),
        supabase.from("master_contract_types").select("name").eq("is_active", true).order("name")
      ]);`;
const newFetch = `const [{ data: usersData }, { data: deptsData }, { data: citiesData }, { data: vendorsData }, { data: contractTypesData }, { data: indData }, { data: venData }] = await Promise.all([
        supabase.from("user_master").select("id, full_name, email").eq("is_active", true),
        supabase.from("departments").select("id, name").eq("is_active", true),
        supabase.from("master_cities").select("*").order("city_name"),
        supabase.from("vendor_master").select("*").order("name"),
        supabase.from("master_contract_types").select("name").eq("is_active", true).order("name"),
        supabase.from("master_industry_types").select("*").eq("is_active", true).order("name"),
        supabase.from("master_vendor_types").select("*").eq("is_active", true).order("name")
      ]);`;
code = code.replace(oldFetch, newFetch);

const oldSetTypes = `if (contractTypesData) {
        const uniqueTypes = Array.from(new Set([
          ...contractTypesData.map(c => c.name),
          'AMC', 'Subscription', 'Perpetual License', 'Other'
        ]));
        setMasterContractTypes(uniqueTypes);
      }`;
const newSetTypes = `if (contractTypesData) {
        const uniqueTypes = Array.from(new Set([
          ...contractTypesData.map(c => c.name),
          'AMC', 'Subscription', 'Perpetual License', 'Other'
        ]));
        setMasterContractTypes(uniqueTypes);
      }
      if (indData) setMasterIndustryTypes(indData);
      if (venData) setMasterVendorTypes(venData);`;
code = code.replace(oldSetTypes, newSetTypes);

// 4. resetForm
code = code.replace(
  /setFormIndustryType\(""\);\n    setFormVendorType\(""\);/,
  `setFormIndustryType("");
    setFormVendorType([]);`
);

// 5. handleVendorChange
code = code.replace(
  /setFormIndustryType\(vendor\.industry_type \|\| ""\);\n      setFormVendorType\(vendor\.vendor_type \|\| ""\);/,
  `setFormIndustryType(vendor.industry_type || "");
      setFormVendorType(vendor.vendor_type ? vendor.vendor_type.split(",").map((s: string) => s.trim()) : []);`
);

// 6. handleEdit
code = code.replace(
  /setFormIndustryType\(rec\.industry_type \|\| ""\);\n    setFormVendorType\(rec\.vendor_type \|\| ""\);/,
  `setFormIndustryType(rec.industry_type || "");
    setFormVendorType(rec.vendor_type ? rec.vendor_type.split(",").map((s: string) => s.trim()) : []);`
);

// 7. handleSave
code = code.replace(
  /industry_type: formIndustryType \|\| null,\n      vendor_type: formVendorType \|\| null,/,
  `industry_type: formIndustryType || null,
      vendor_type: formVendorType.length > 0 ? formVendorType.join(", ") : null,`
);

// 8. Form UI
const oldUI = `<div className="space-y-2 col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Industry Type</label>
                      <select disabled={!!formVendorId} value={formIndustryType} onChange={(e) => setFormIndustryType(e.target.value)} className={\`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none \${formVendorId ? "bg-gray-50 opacity-70" : "bg-surface"} border-border text-foreground focus:border-accent focus:ring-accent/20 border\`}>
                        <option value="">Select Industry Type</option>
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
                        {formIndustryType && !["IT Software", "IT Hardware / Electronics", "Manufacturing", "BFSI (Banking, Financial Services, Insurance)", "Retail & E-Commerce", "Healthcare & Pharma", "Telecommunications", "Education & EdTech", "Construction & Real Estate", "Logistics & Supply Chain", "Government & PSU", "Other"].includes(formIndustryType) && (
                          <option value={formIndustryType}>{formIndustryType}</option>
                        )}
                      </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Vendor Type</label>
                      <select disabled={!!formVendorId} value={formVendorType} onChange={(e) => setFormVendorType(e.target.value)} className={\`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none \${formVendorId ? "bg-gray-50 opacity-70" : "bg-surface"} border-border text-foreground focus:border-accent focus:ring-accent/20 border\`}>
                        <option value="">Select Vendor Type</option>
                        <option value="OEM (Original Equipment Manufacturer)">OEM (Original Equipment Manufacturer)</option>
                        <option value="Authorized Distributor">Authorized Distributor</option>
                        <option value="Value Added Reseller (VAR)">Value Added Reseller (VAR)</option>
                        <option value="System Integrator (SI)">System Integrator (SI)</option>
                        <option value="Managed Service Provider (MSP)">Managed Service Provider (MSP)</option>
                        <option value="Implementation Partner">Implementation Partner</option>
                        <option value="Consultant / Advisory">Consultant / Advisory</option>
                        <option value="Direct Retailer">Direct Retailer</option>
                        <option value="Other">Other</option>
                        {formVendorType && !["OEM (Original Equipment Manufacturer)", "Authorized Distributor", "Value Added Reseller (VAR)", "System Integrator (SI)", "Managed Service Provider (MSP)", "Implementation Partner", "Consultant / Advisory", "Direct Retailer", "Other"].includes(formVendorType) && (
                          <option value={formVendorType}>{formVendorType}</option>
                        )}
                      </select>
                    </div>`;

const newUI = `<div className="space-y-2 col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Industry Type</label>
                      <div className="flex gap-2">
                        <select disabled={!!formVendorId} value={formIndustryType} onChange={(e) => {
                          setFormIndustryType(e.target.value);
                          setFormVendorType([]);
                        }} className={\`flex-1 h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none \${formVendorId ? "bg-gray-50 opacity-70" : "bg-surface"} border-border text-foreground focus:border-accent focus:ring-accent/20 border\`}>
                          <option value="">Select Industry Type</option>
                          {masterIndustryTypes.map(ind => (
                            <option key={ind.id} value={ind.name}>{ind.name}</option>
                          ))}
                          {formIndustryType && !masterIndustryTypes.find(i => i.name === formIndustryType) && (
                            <option value={formIndustryType}>{formIndustryType}</option>
                          )}
                        </select>
                        <button type="button" disabled={!!formVendorId} onClick={async () => {
                          const newInd = prompt("Enter new Industry Type:");
                          if (newInd && newInd.trim()) {
                            await supabase.from("master_industry_types").insert({ name: newInd.trim() });
                            await fetchDependencies();
                            setFormIndustryType(newInd.trim());
                            setFormVendorType([]);
                          }
                        }} className={\`h-11 w-11 flex items-center justify-center rounded-xl transition-all flex-shrink-0 \${formVendorId ? "bg-gray-100 text-gray-400" : "bg-accent text-white hover:bg-accent/90"}\`} title="Add New Industry">
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Vendor Type (Multi-Select)</label>
                      <div className="flex flex-col gap-2">
                        <div className={\`flex flex-wrap gap-2 min-h-[44px] p-2 rounded-xl border border-border items-center \${formVendorId ? "bg-gray-50 opacity-70" : "bg-surface"}\`}>
                          {masterVendorTypes.filter(v => v.industry_name === formIndustryType).map(v => (
                            <button
                              key={v.id}
                              type="button"
                              disabled={!!formVendorId}
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
                              } \${formVendorId ? "cursor-not-allowed opacity-80" : ""}\`}
                            >
                              {formVendorType.includes(v.name) && <Check className="h-3 w-3" />}
                              {v.name}
                            </button>
                          ))}
                          {!formIndustryType && (
                            <span className="text-xs text-gray-500 italic px-2">Please select an Industry Type first.</span>
                          )}
                          {formIndustryType && (
                             <button type="button" disabled={!!formVendorId} onClick={async () => {
                               const newVen = prompt(\`Enter new Vendor Type for \${formIndustryType}:\`);
                               if (newVen && newVen.trim()) {
                                 await supabase.from("master_vendor_types").insert({ name: newVen.trim(), industry_name: formIndustryType });
                                 await fetchDependencies();
                                 setFormVendorType([...formVendorType, newVen.trim()]);
                               }
                             }} className={\`h-7 px-2 text-xs ml-auto transition-colors flex items-center rounded \${formVendorId ? "text-gray-400 cursor-not-allowed" : "text-accent hover:bg-accent/10 hover:text-accent/80"}\`}>
                               <Plus className="h-3 w-3 mr-1" /> Add Type
                             </button>
                          )}
                        </div>
                      </div>
                    </div>`;

code = code.replace(oldUI, newUI);

fs.writeFileSync(path, code);
console.log("Updated AMC page");
