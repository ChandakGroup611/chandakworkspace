const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

const fetchMastersLogic = `
  const fetchMasters = async () => {
    try {
      const [priority, modules, submodules, issue_subs] = await Promise.all([
        supabase.from('priority_master').select('id, name'),
        supabase.from('module_master').select('id, name'),
        supabase.from('sub_module_master').select('id, name'),
        supabase.from('issue_sub_category_master').select('id, name')
      ]);
      setMasters({
        priority: priority.data || [],
        modules: modules.data || [],
        submodules: submodules.data || [],
        issue_subs: issue_subs.data || []
      });
    } catch (e) {
      console.error(e);
    }
  };
`;

if (!content.includes('const fetchMasters = async')) {
  content = content.replace('const fetchDatabaseGovernanceConfigs = async () => {', fetchMastersLogic + '\n  const fetchDatabaseGovernanceConfigs = async () => {');
  content = content.replace('fetchDatabaseGovernanceConfigs();', 'fetchDatabaseGovernanceConfigs();\n    fetchMasters();');
}

// Remove empty TS casts
content = content.replace(/\(\{\} as any\)\?/g, 'masters?');

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
