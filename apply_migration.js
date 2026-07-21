const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const files = walkSync('d:\\adios\\components');
files.push('d:\\adios\\app\\workspaces\\page.tsx');
files.push('d:\\adios\\app\\workspaces\\WorkspacesClient.tsx');
files.push('d:\\adios\\app\\page.tsx');

let updatedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Pattern 1: Standalone panels that have bg-surface and borders
  const regex1 = /className={?`([^`]*?)bg-surface([^`]*?)`}?/g;
  content = content.replace(regex1, (match, p1, p2) => {
    if (match.includes("border") && !match.includes("theme-card-structural") && !match.includes("AppCard") && !match.includes("AppButton") && !match.includes("AppBadge")) {
      changed = true;
      // Replace bg-surface with theme-card-structural and strip hardcoded borders
      let newClass = p1 + "theme-card-structural " + p2;
      newClass = newClass.replace(/bg-surface/g, "").replace(/border-border/g, "").replace(/border\s/g, " ");
      return `className={\`${newClass.trim().replace(/\s+/g, ' ')}\`}`;
    }
    return match;
  });

  const regex2 = /className="([^"]*?)bg-surface([^"]*?)"/g;
  content = content.replace(regex2, (match, p1, p2) => {
    if (match.includes("border") && !match.includes("theme-card-structural") && !match.includes("AppCard") && !match.includes("AppButton") && !match.includes("AppBadge")) {
      changed = true;
      let newClass = p1 + "theme-card-structural " + p2;
      newClass = newClass.replace(/bg-surface/g, "").replace(/border-border/g, "").replace(/border\s/g, " ");
      return `className="${newClass.trim().replace(/\s+/g, ' ')}"`;
    }
    return match;
  });

  // Specific overrides for Sidebar Links and specific components
  if (file.includes('Sidebar.tsx')) {
    if(content.includes('hover:bg-surface/80')) {
        content = content.replace(/hover:bg-surface\/80/g, "hover:bg-elevated/40");
        changed = true;
    }
    if(content.includes('hover:bg-surface border-transparent hover:border-border')) {
        content = content.replace(/hover:bg-surface border-transparent hover:border-border/g, "hover:bg-elevated/40 border-transparent hover:border-border/50");
        changed = true;
    }
    if (content.includes('bg-surface/90')) {
        content = content.replace(/bg-surface\/90/g, "bg-surface/90 backdrop-blur-md");
        changed = true;
    }
    if (content.includes('bg-surface border-border')) {
        content = content.replace(/bg-surface border-border/g, "theme-card-structural");
        changed = true;
    }
    if (content.includes('bg-elevated')) {
        content = content.replace(/bg-elevated/g, "bg-elevated/50");
        changed = true;
    }
  }

  if (file.includes('Navbar.tsx')) {
    if (content.includes('bg-elevated/80 border-border text-foreground')) {
        content = content.replace(/bg-elevated\/80 border-border text-foreground/g, "theme-input-structural text-foreground");
        changed = true;
    }
    if (content.includes('bg-surface border-border text-muted')) {
        content = content.replace(/bg-surface border-border text-muted/g, "theme-button-structural text-muted");
        changed = true;
    }
    if (content.includes('bg-surface border-border text-foreground')) {
        content = content.replace(/bg-surface border-border text-foreground/g, "theme-card-structural text-foreground");
        changed = true;
    }
  }

  // Remove generic bg-surface from inner modules that should just inherit the AppCard structural parent
  if (file.includes('TicketWorkspaceConsole.tsx') || file.includes('TicketsDashboard.tsx')) {
    const bgSurfaceRegex = /\bbg-surface\b/g;
    if (bgSurfaceRegex.test(content)) {
        content = content.replace(bgSurfaceRegex, "theme-card-structural");
        changed = true;
    }
  }

  // Tables
  if (file.includes('WorkspaceMasterTable.tsx')) {
    const bgSurfaceRegex = /\bbg-surface\b/g;
    if (bgSurfaceRegex.test(content)) {
        content = content.replace(bgSurfaceRegex, "bg-surface/40 backdrop-blur");
        changed = true;
    }
  }
  
  if (file.includes('SprintBoard.tsx')) {
    const bgSurfaceRegex = /\bbg-surface\b/g;
    if (bgSurfaceRegex.test(content)) {
        content = content.replace(bgSurfaceRegex, "theme-input-structural");
        changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updatedFiles++;
  }
}

console.log(`Successfully migrated ${updatedFiles} files to structural 3D hooks.`);
