const fs = require('fs');
let content = fs.readFileSync('rebuild_grid_2x2_clean.js', 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const tagsBlockClean =')) {
    lines[i] = "const tagsBlockClean = tagsBlockRaw.replace(new RegExp('(</div>\\\\s*)+$'), '').trim();";
  }
  if (lines[i].includes('const tagsBlockFinal =')) {
    lines[i] = "const tagsBlockFinal = tagsBlockClean.replace('<div className=\"space-y-1.5 mt-5\">', '<div className=\"space-y-1.5\">').replace(new RegExp('<label[\\\\s\\\\S]*?</label>', 'g'), '');";
  }
  if (lines[i].includes('const attachmentsInner =')) {
    lines[i] = "const attachmentsInner = attachmentsRaw.replace(new RegExp('(</div>\\\\s*)+$'), '').replace('{/* Attachments */}', '').trim();";
  }
  if (lines[i].includes('const s5Clean =')) {
    lines[i] = "const s5Clean = s5BlockRaw.replace(new RegExp('(</div>\\\\s*)+$'), '').trim();";
  }
  if (lines[i].includes('const s5InnerContent =')) {
    lines[i] = "const s5InnerContent = s5BlockRaw.trim().replace(new RegExp('(</div>\\\\s*)+$'), '');";
  }
}

fs.writeFileSync('rebuild_grid_2x2_clean.js', lines.join('\n'));
console.log('Fixed JS file safely!');
