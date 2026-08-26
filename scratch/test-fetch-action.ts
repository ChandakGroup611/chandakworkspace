import { fetchRequirement } from '../lib/actions/requirements';

async function main() {
  const req = await fetchRequirement('ERP-REQ-2026-000010');
  console.log("Req code:", req?.code);
  console.log("Req custom_fields:", JSON.stringify(req?.custom_fields, null, 2));
}

main().catch(console.error);
