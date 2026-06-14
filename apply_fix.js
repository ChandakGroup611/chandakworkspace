const fs = require('fs');

let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// Fix fetchRequirements signature
content = content.replace(
  'export async function fetchRequirements() {',
  'export async function fetchRequirements(workspaceId?: string | null) {'
);

// Add missing deleteRequirement function
if (!content.includes('export async function deleteRequirement')) {
  content += `\n
export async function deleteRequirement(reqId: string, performedBy: string) {
  const { data: userRole } = await supabaseAdmin.from('user_roles').select('role_master(role_code)').eq('user_id', performedBy).single();
  const isSuperAdmin = (userRole?.role_master as any)?.role_code === 'SUPER_ADMIN';
  if (!isSuperAdmin) throw new Error('Only SUPER_ADMIN can delete requirements.');
  
  const { error } = await supabaseAdmin.from('requirements').delete().eq('id', reqId);
  if (error) throw new Error('Failed to delete requirement: ' + error.message);
  
  revalidatePath('/requirements');
  return { success: true };
}
`;
}

// Fix submitRequirementAnalysis signature
if (content.includes('export async function submitRequirementAnalysis(reqId: string, payload: any, performedBy: string) {')) {
  content = content.replace(
    'export async function submitRequirementAnalysis(reqId: string, payload: any, performedBy: string) {',
    'export async function submitRequirementAnalysis(reqId: string, payload: any, performedBy: string, action?: "ACCEPT" | "HOLD" | "CANCEL") {'
  );
  
  // Inject early returns for CANCEL and HOLD
  const authCheckEnd = content.indexOf('// 2. Prepare Update Payload');
  if (authCheckEnd !== -1) {
    const cancelHoldBlock = `
  if (action === 'CANCEL') {
     await supabaseAdmin.from('requirements').update({ current_stage: 'Cancelled', approval_status: 'Cancelled' }).eq('id', reqId);
     revalidatePath(\`/requirements/\${reqId}\`);
     revalidatePath(\`/requirements\`);
     return { success: true };
  }
  if (action === 'HOLD') {
     await supabaseAdmin.from('requirements').update({ current_stage: 'On Hold', approval_status: 'On Hold' }).eq('id', reqId);
     revalidatePath(\`/requirements/\${reqId}\`);
     revalidatePath(\`/requirements\`);
     return { success: true };
  }
  `;
    content = content.slice(0, authCheckEnd) + cancelHoldBlock + content.slice(authCheckEnd);
  }
}

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
console.log('Fixed requirements.ts');
