const fs = require('fs');

function fixFormState(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it's already in the formData initialization
  if (!content.includes('business_reason: "",\n    requirement_domain:')) {
    const replacement = `business_reason: "",
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
    
    // Replace the business_reason: "", line with the new fields in the useState
    content = content.replace(/business_reason:\s*"",/, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed form state in', filePath);
  } else {
    console.log('Already fixed in', filePath);
  }
}

fixFormState('d:/adios/components/tickets/TicketFormERP.tsx');
fixFormState('d:/adios/components/tickets/TicketFormInfra.tsx');
fixFormState('d:/adios/components/tickets/TicketFormOthers.tsx');
