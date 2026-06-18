const fs = require('fs');
let buf = fs.readFileSync('.env.local');
// Convert to string ignoring null bytes, or rather replace \x00 with nothing
let str = '';
for (let i = 0; i < buf.length; i++) {
  if (buf[i] !== 0) {
    str += String.fromCharCode(buf[i]);
  }
}
fs.writeFileSync('.env.local', str);
console.log('Fixed .env.local');
