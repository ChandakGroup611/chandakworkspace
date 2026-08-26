import { fetchRequirement } from './lib/actions/requirements';

async function main() {
  const req = await fetchRequirement('64f29684-de50-45ca-a596-c39e9134713d');
  console.log("Business Impact root:", req?.business_impact);
  console.log("Business Impact custom_fields:", req?.custom_fields?.business_impact);
  console.log("Evaluated:", req?.business_impact || req?.custom_fields?.business_impact || "");
}

main().catch(console.error);
