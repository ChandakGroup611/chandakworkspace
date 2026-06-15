const fs = require('fs');
const vercel = fs.readFileSync('.env.vercel', 'utf-8');
const tokenMatch = vercel.match(/VERCEL_OIDC_TOKEN="([^"]+)"/);
if (tokenMatch) {
  console.log('Token exists');
} else {
  console.log('No token');
}
