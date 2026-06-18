const fs = require('fs');
const path = require('path');
const dir = 'supabase/migrations';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

for (const file of files) {
  const filePath = path.join(dir, file);
  const buf = fs.readFileSync(filePath);
  
  // Check if it has UTF-16 LE BOM (FF FE) or if it's mostly UTF-16
  // A simple heuristic: if it has many null bytes, it's probably UTF-16 LE
  let nullBytes = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0) nullBytes++;
  }
  
  if (nullBytes > buf.length / 4) {
    console.log(`Converting ${file} from UTF-16 LE to UTF-8...`);
    const str = buf.toString('utf16le');
    fs.writeFileSync(filePath, str, 'utf8');
  }
}
console.log('Conversion complete.');
