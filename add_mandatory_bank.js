const fs = require('fs');
const file = 'd:/adios/app/amc/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add asterisks to labels
content = content.replace(/<label className="([^"]+)">Bank Name<\/label>/, '<label className="$1">Bank Name <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">Account Number<\/label>/, '<label className="$1">Account Number <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">IFSC Code<\/label>/, '<label className="$1">IFSC Code <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">Branch Name<\/label>/, '<label className="$1">Branch Name <span className="text-red-500">*</span></label>');
content = content.replace(/<label className="([^"]+)">State<\/label>/, '<label className="$1">State <span className="text-red-500">*</span></label>');

// For City, the label has a span inside it and a button, so it's a bit more complex.
// <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-between">
//   <span>City</span>
//   <button ...>
content = content.replace(/<span>City<\/span>/, '<span>City <span className="text-red-500">*</span></span>');

// Inject validation code into handleSave
const validationCode = `    if (!bankName.trim()) { setErrorAlert("Bank Name is mandatory."); return; }
    if (!bankAccountNo.trim()) { setErrorAlert("Bank Account Number is mandatory."); return; }
    if (!bankIfsc.trim()) { setErrorAlert("Bank IFSC Code is mandatory."); return; }
    if (!bankBranch.trim()) { setErrorAlert("Bank Branch Name is mandatory."); return; }
    if (!bankState) { setErrorAlert("Bank State is mandatory."); return; }
    if (!bankCity) { setErrorAlert("Bank City is mandatory."); return; }`;

content = content.replace(/    if \(\!formVendorType\) \{ setErrorAlert\("Vendor Type is mandatory\."\); return; \}/, '    if (!formVendorType) { setErrorAlert("Vendor Type is mandatory."); return; }\n' + validationCode);

fs.writeFileSync(file, content);
console.log('Added mandatory bank details');
