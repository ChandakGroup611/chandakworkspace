const fs = require('fs');

const hostPath = 'D:/adios/components/vehicle/FleetDeskHost.tsx';
let code = fs.readFileSync(hostPath, 'utf8');

const lines = code.split('\n');
let s1Idx = -1, s2Idx = -1, s2PriceIdx = -1, s3Idx = -1, s4Idx = -1, s5Idx = -1, endIdx = -1;

for (let i = 12360; i < 13700; i++) {
  if (lines[i].includes('{/* SECTION 1: REGISTRATION & VEHICLE SPECS */}')) s1Idx = i;
  if (lines[i].includes('{/* SECTION 2: CHASSIS, ENGINE & LEGAL OWNERSHIP */}')) s2Idx = i;
  if (lines[i].includes('{/* VEHICLE PRICING & ON-ROAD BREAKDOWN */}')) s2PriceIdx = i;
  if (lines[i].includes('{/* SECTION 3: STATUTORY COMPLIANCE & VALIDITY */}')) s3Idx = i;
  if (lines[i].includes('{/* SECTION 4: FLEET OPERATIONS & DRIVER */}')) s4Idx = i;
  if (lines[i].includes('{/* SECTION 5: VEHICLE LEGAL & COMPLIANCE DOCUMENTS VAULT */}')) s5Idx = i;
  if (lines[i].includes('</TransactionFormLayout>') && s5Idx !== -1 && endIdx === -1) endIdx = i;
}

console.log('Detailed Section indexes:', { s1Idx, s2Idx, s2PriceIdx, s3Idx, s4Idx, s5Idx, endIdx });

if (s1Idx !== -1 && s2Idx !== -1 && s2PriceIdx !== -1 && s3Idx !== -1 && s4Idx !== -1 && s5Idx !== -1 && endIdx !== -1) {
  const s1Code = lines.slice(s1Idx, s2Idx).join('\n');
  
  // Registration part of Section 2
  const s2RegCode = lines.slice(s2Idx, s2PriceIdx).join('\n') + '\n              </div>';
  
  // Financials part of Section 2
  const s2FinCode = lines.slice(s2PriceIdx, s3Idx - 1).join('\n'); // without closing div of sec2

  const s3Code = lines.slice(s3Idx, s4Idx).join('\n');
  const s4Code = lines.slice(s4Idx, s5Idx).join('\n');
  const s5Code = lines.slice(s5Idx, endIdx - 1).join('\n');

  const tabHeader = `            {/* Edit Vehicle Domain Section Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-elevated/60 border border-border rounded-xl">
              <AppButton
                type="button"
                variant={editVehicleSectionTab === "SPECS" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setEditVehicleSectionTab("SPECS")}
                leftIcon={<Car className="h-3.5 w-3.5" />}
                className="h-8 text-xs font-semibold whitespace-nowrap"
              >
                Identity & Specs
              </AppButton>
              <AppButton
                type="button"
                variant={editVehicleSectionTab === "REGISTRATION" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setEditVehicleSectionTab("REGISTRATION")}
                leftIcon={<Building2 className="h-3.5 w-3.5" />}
                className="h-8 text-xs font-semibold whitespace-nowrap"
              >
                Registration & RTO
              </AppButton>
              <AppButton
                type="button"
                variant={editVehicleSectionTab === "FINANCIALS" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setEditVehicleSectionTab("FINANCIALS")}
                leftIcon={<IndianRupee className="h-3.5 w-3.5" />}
                className="h-8 text-xs font-semibold whitespace-nowrap"
              >
                Valuation & Financials
              </AppButton>
              <AppButton
                type="button"
                variant={editVehicleSectionTab === "ALLOCATION" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setEditVehicleSectionTab("ALLOCATION")}
                leftIcon={<Users className="h-3.5 w-3.5" />}
                className="h-8 text-xs font-semibold whitespace-nowrap"
              >
                Duty & Allocation
              </AppButton>
              <AppButton
                type="button"
                variant={editVehicleSectionTab === "DOCS" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setEditVehicleSectionTab("DOCS")}
                leftIcon={<FileCheck className="h-3.5 w-3.5" />}
                className="h-8 text-xs font-semibold whitespace-nowrap"
              >
                Compliance & Docs ({editVehicleDocs.length})
              </AppButton>
            </div>

            {/* TAB 1: IDENTITY & SPECS */}
            {editVehicleSectionTab === "SPECS" && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                ${s1Code}
              </div>
            )}

            {/* TAB 2: REGISTRATION & RTO */}
            {editVehicleSectionTab === "REGISTRATION" && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                ${s2RegCode}
              </div>
            )}

            {/* TAB 3: FINANCIALS & VALUATION */}
            {editVehicleSectionTab === "FINANCIALS" && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3.5">
                  ${s2FinCode}
                </div>
              </div>
            )}

            {/* TAB 4: ALLOCATION */}
            {editVehicleSectionTab === "ALLOCATION" && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                ${s4Code}
              </div>
            )}

            {/* TAB 5: COMPLIANCE & DOCS */}
            {editVehicleSectionTab === "DOCS" && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                ${s3Code}
                ${s5Code}
              </div>
            )}`;

  const newLines = [
    ...lines.slice(0, s1Idx),
    tabHeader,
    ...lines.slice(endIdx - 1)
  ];

  fs.writeFileSync(hostPath, newLines.join('\n'), 'utf8');
  console.log('Successfully structured Edit Vehicle modal with dedicated Financials tab!');
} else {
  console.error('Could not find all section indices.');
}
