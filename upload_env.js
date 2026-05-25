const fs = require('fs');
const { execSync } = require('child_process');

try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const lines = envFile.split('\n');

  for (const line of lines) {
    if (!line || line.trim() === '' || line.startsWith('#')) continue;
    
    const [key, ...valueArr] = line.split('=');
    const value = valueArr.join('=').trim().replace(/['"$\\]/g, ''); // basic escaping
    
    if (key && value) {
      const cleanKey = key.trim();
      console.log(`Adding ${cleanKey}...`);
      try {
        execSync(`npx vercel env add ${cleanKey} production`, { 
          input: value,
          stdio: ['pipe', 'inherit', 'inherit'] 
        });
        console.log(`Successfully added ${cleanKey}`);
      } catch (e) {
        console.log(`Failed to add ${cleanKey}`);
      }
    }
  }
} catch (e) {
  console.error("Error reading .env.local:", e);
}
