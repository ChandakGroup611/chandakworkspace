const fs = require('fs');
const reqPath = 'd:/adios/lib/actions/requirements.ts';
let r = fs.readFileSync(reqPath, 'utf8');

const customFieldsInsert = `          business_value: payload.business_value_id || null,
          business_impact: payload.business_impact || null,
          budget_impact: payload.budget_impact || null,
          estimated_resources: payload.estimated_resources || null,
          requirement_domain: payload.requirement_domain || null,
          target_system: payload.target_system || null,
          integrations: payload.integrations || null,
          data_privacy: payload.data_privacy || null,
          software_cost: payload.software_cost || null,
          dev_cost: payload.dev_cost || null,
          target_environment: payload.target_environment || null,
          hardware_needs: payload.hardware_needs || null,
          capex_amount: payload.capex_amount || null,
          opex_amount: payload.opex_amount || null,
          estimated_cost: payload.estimated_cost,`;

r = r.replace(/business_value: payload\.business_value_id \|\| null,\s*estimated_cost: payload\.estimated_cost,/, customFieldsInsert);

fs.writeFileSync(reqPath, r, 'utf8');
console.log('Updated requirements.ts');
