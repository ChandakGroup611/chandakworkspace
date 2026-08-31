const fs = require('fs');
const path = require('path');
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  const keys = [];
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=/);
      if (match) {
        keys.push(match[1]);
      }
    }
  });
  console.log("Keys:", keys);
} else {
  console.log(".env.local not found");
}
