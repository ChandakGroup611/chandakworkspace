const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? 
            walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let modifiedFiles = [];

walkDir('D:/adios/components', (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Regex to find <AppButton without variant attribute, but has className containing text-muted, bg-surface, hover:bg-surface, etc.
        // We will look for <AppButton ...> and replace if it doesn't have variant=" and it has className=...
        
        // Let's do a simpler approach: 
        // Find all <AppButton tags
        // If they don't have variant={ or variant="
        // Check if className contains "text-muted", "bg-surface", "hover:bg-surface", "bg-transparent", "text-muted-foreground", "hover:text-foreground"
        // If yes, we assume it was meant to be variant="ghost" or variant="outline". Usually "ghost".
        
        let regex = /<AppButton([^>]*?)>/g;
        content = content.replace(regex, (match, attrs) => {
            if (attrs.includes('variant=') || attrs.includes('variant {')) {
                // Check if it's explicitly variant="primary" but it shouldn't be
                if (attrs.includes('variant="primary"') && (attrs.includes('text-muted') || attrs.includes('bg-surface'))) {
                    return `<AppButton${attrs.replace(/variant="primary"/, 'variant="ghost"')}>`;
                }
                return match;
            }
            
            // Missing variant. Check if it has classes indicating it shouldn't be primary
            let isGhostLike = false;
            if (attrs.includes('text-muted') || 
                attrs.includes('hover:bg-surface') || 
                attrs.includes('bg-surface/50') || 
                attrs.includes('bg-transparent') || 
                attrs.includes('text-subtle') ||
                attrs.includes('text-muted-foreground')
            ) {
                isGhostLike = true;
            }
            
            if (isGhostLike) {
                return `<AppButton variant="ghost"${attrs}>`;
            }
            
            return match;
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            modifiedFiles.push(filePath);
        }
    }
});

walkDir('D:/adios/app', (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        let regex = /<AppButton([^>]*?)>/g;
        content = content.replace(regex, (match, attrs) => {
            if (attrs.includes('variant=')) {
                if (attrs.includes('variant="primary"') && (attrs.includes('text-muted') || attrs.includes('bg-surface'))) {
                    return `<AppButton${attrs.replace(/variant="primary"/, 'variant="ghost"')}>`;
                }
                return match;
            }
            
            let isGhostLike = false;
            if (attrs.includes('text-muted') || 
                attrs.includes('hover:bg-surface') || 
                attrs.includes('bg-surface/50') || 
                attrs.includes('bg-transparent') || 
                attrs.includes('text-subtle') ||
                attrs.includes('text-muted-foreground')
            ) {
                isGhostLike = true;
            }
            
            if (isGhostLike) {
                return `<AppButton variant="ghost"${attrs}>`;
            }
            
            return match;
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            modifiedFiles.push(filePath);
        }
    }
});

console.log("Modified files:", modifiedFiles);
