const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tkovzymkubxtpcgynkgd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68'
);

const dirsToScan = ['d:\\adios\\app', 'd:\\adios\\components', 'd:\\adios\\lib'];
const extractedPerms = new Set();

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const regex1 = /hasPermission\s*\(\s*['"]([A-Z0-9_]+)['"]\s*\)/g;
      let match;
      while ((match = regex1.exec(content)) !== null) {
        extractedPerms.add(match[1]);
      }
      
      const regex1_1 = /hasPermission\s*\(\s*[^,]+,\s*['"]([A-Z0-9_]+)['"]\s*\)/g;
      while ((match = regex1_1.exec(content)) !== null) {
        extractedPerms.add(match[1]);
      }
      
      const regex2 = /permission:\s*['"]([A-Z0-9_]+)['"]/g;
      while ((match = regex2.exec(content)) !== null) {
        extractedPerms.add(match[1]);
      }
    }
  }
}

async function run() {
  dirsToScan.forEach(scanDir);
  console.log(`Found ${extractedPerms.size} unique permissions in codebase.`);
  
  const { data: dbPerms, error } = await supabase.from('permissions').select('code');
  if (error) {
    console.error('Failed to fetch DB perms', error);
    return;
  }
  
  const dbPermCodes = new Set(dbPerms.map(p => p.code));
  
  const missingInDb = [];
  for (const code of extractedPerms) {
    if (!dbPermCodes.has(code)) {
      missingInDb.push(code);
    }
  }
  
  console.log(`Found ${missingInDb.length} permissions missing in DB:`, missingInDb);
  
  if (missingInDb.length > 0) {
    const recordsToInsert = missingInDb.map(code => {
      const parts = code.split('_');
      let action = 'VIEW';
      if (['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE', 'EXPORT'].includes(parts[parts.length-1])) {
        action = parts.pop();
      }
      const module = parts[0] || 'GENERAL';
      const submodule = parts.length > 1 ? parts.slice(1).join(' ') : 'Core';
      
      return {
        name: code.replace(/_/g, ' '),
        code: code,
        module: module,
        submodule: submodule,
        action: action
      };
    });
    
    console.log('Inserting...', recordsToInsert);
    const { error: insertError } = await supabase.from('permissions').insert(recordsToInsert);
    if (insertError) {
      console.error('Failed to insert missing perms', insertError);
    } else {
      console.log('Successfully synchronized missing permissions into the DB!');
    }
  } else {
    console.log('Database is perfectly synchronized with the codebase.');
  }
}

run();
