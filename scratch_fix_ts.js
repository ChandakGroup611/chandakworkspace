const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

// 1. Add masters state
content = content.replace(
  'const [regulatoryOptions, setRegulatoryOptions] = useState<string[]>([]);',
  `const [regulatoryOptions, setRegulatoryOptions] = useState<string[]>([]);
  const [masters, setMasters] = useState<any>({});`
);

// 2. Fetch masters inside fetchDatabaseGovernanceConfigs
content = content.replace(
  '// 1. Fetch custom dynamic attributes registry definitions',
  `// Fetch all masters concurrently
      const [
        sysRes, modRes, subModRes, catRes, subCatRes, prioRes
      ] = await Promise.all([
        supabase.from("software_systems").select("*").eq("is_deleted", false),
        supabase.from("software_modules").select("*").eq("is_deleted", false),
        supabase.from("software_submodules").select("*").eq("is_deleted", false),
        supabase.from("ticket_categories").select("*").eq("is_deleted", false),
        supabase.from("ticket_subcategories").select("*").eq("is_deleted", false),
        supabase.from("priority_master").select("*").eq("is_deleted", false)
      ]);
      setMasters({
        systems: sysRes.data || [],
        modules: modRes.data || [],
        submodules: subModRes.data || [],
        ticket_category: catRes.data || [],
        issue_subs: subCatRes.data || [],
        priority: prioRes.data || []
      });

      // 1. Fetch custom dynamic attributes registry definitions`
);

// 3. Fix missing icons imports
content = content.replace(
  /import \{ (.*) \} from "lucide-react";/,
  (match, p1) => {
    const toAdd = ['Search', 'Edit2', 'Trash2'].filter(icon => !p1.includes(icon));
    return `import { ${p1}${toAdd.length ? ', ' + toAdd.join(', ') : ''} } from "lucide-react";`;
  }
);

// 4. Remove isLightMode usage or define it
content = content.replace(/\$\{isLightMode \? "[^"]+" : "([^"]+)"\}/g, '$1');
content = content.replace(/isLightMode \? "[^"]+" : "([^"]+)"/g, '"$1"');

// 5. Add handleDelete stub if missing
if (!content.includes('const handleDelete')) {
  content = content.replace(
    'const commitVersionSnapshot = async',
    `const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this requirement?")) {
      const m = await import("@/lib/actions/requirements");
      const { data: { user } } = await supabase.auth.getUser();
      await m.deleteRequirement(id, user?.id || "");
      if (activeWorkspaceId) loadRequirements(activeWorkspaceId);
    }
  };
  
  const commitVersionSnapshot = async`
  );
}

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
