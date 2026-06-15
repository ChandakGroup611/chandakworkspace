const fs = require('fs');
const https = require('https');

const vercel = fs.readFileSync('.env.vercel', 'utf-8');
const tokenMatch = vercel.match(/VERCEL_OIDC_TOKEN="([^"]+)"/);

if (!tokenMatch) {
  console.log('No token');
  process.exit(1);
}

const token = tokenMatch[1];
const projectId = vercel.match(/project_id":"([^"]+)"/)?.[1] || 'prj_T5llkUTrASUcm81jCSQTqrgyHbWL'; // Extracted from decoded JWT roughly

const options = {
  hostname: 'api.vercel.com',
  path: `/v9/projects/${projectId}/env?environment=production`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const urlEnv = json.envs?.find(e => e.key === 'NEXT_PUBLIC_SUPABASE_URL');
      console.log('URL:', urlEnv ? urlEnv.value : 'Not found');
    } catch(e) {
      console.log('Error parsing:', data);
    }
  });
});

req.on('error', e => console.log('Request error:', e));
req.end();
