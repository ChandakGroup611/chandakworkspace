const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// 1. Fix fetchRequirements signature
content = content.replace(/export async function fetchRequirements\(workspaceId: string\) {/, 'export async function fetchRequirements(workspaceId?: string | null) {');

// 2. Add fetchRequirement
if (!content.includes('export async function fetchRequirement(')) {
  content += `\n\nexport async function fetchRequirement(reqId: string) {
  const { data, error } = await supabaseAdmin.from('requirements').select('*').eq('id', reqId).single();
  if (error) {
    console.error('Error fetching requirement:', error);
    return null;
  }
  return data;
}`;
}

// 3. Add submitRequirementAnalysis
if (!content.includes('export async function submitRequirementAnalysis(')) {
  content += `\n\nexport async function submitRequirementAnalysis(reqId: string, payload: any) {
  const { data, error } = await supabaseAdmin.from('requirements').update(payload).eq('id', reqId).select().single();
  if (error) {
    console.error('Error submitting requirement analysis:', error);
    throw error;
  }
  return data;
}`;
}

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
