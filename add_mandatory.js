const fs = require('fs');
const file = 'd:/adios/app/amc/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<label className="([^"]+)">Contract Type<\/label>/, '<label className="$1">Contract Type <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">Status<\/label>/, '<label className="$1">Status <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">Purchase Date<\/label>/, '<label className="$1">Purchase Date <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">Assigned To \(Owner\)<\/label>/, '<label className="$1">Assigned To (Owner) <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">Department<\/label>/, '<label className="$1">Department <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">Industry Type<\/label>/, '<label className="$1">Industry Type <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">Vendor Type<\/label>/, '<label className="$1">Vendor Type <span className="text-red-500">*</span></label>');

const validationCode = `    if (!formContractType) { setErrorAlert("Contract Type is mandatory."); return; }
    if (!formStatus) { setErrorAlert("Status is mandatory."); return; }
    if (!formPurchaseDate) { setErrorAlert("Purchase Date is mandatory."); return; }
    if (!formAssignedTo) { setErrorAlert("Assigned To (Owner) is mandatory."); return; }
    if (!formDepartmentId) { setErrorAlert("Department is mandatory."); return; }
    if (!formIndustryType) { setErrorAlert("Industry Type is mandatory."); return; }
    if (!formVendorType) { setErrorAlert("Vendor Type is mandatory."); return; }`;

content = content.replace(/    if \(!formSoftwareName\.trim\(\)\) \{\n      setErrorAlert\("Software Name is mandatory\."\);\n      return;\n    \}/, '    if (!formSoftwareName.trim()) {\n      setErrorAlert("Software Name is mandatory.");\n      return;\n    }\n\n' + validationCode);

fs.writeFileSync(file, content);
console.log('Added mandatory fields');
