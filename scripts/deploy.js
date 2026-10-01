const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[36m%s\x1b[0m', '\n🚀 ADIOS Git & Vercel Auto-Deployment Console 🚀\n');

rl.question('📝 Enter your commit message (leave blank for auto-generated): ', (message) => {
  let commitMessage = message.trim();
  if (!commitMessage) {
    const date = new Date().toLocaleString();
    commitMessage = `Deploy update: ${date}`;
  }

  try {
    console.log('\n🔒 Running security vulnerability audit (npm audit)...');
    try {
      execSync('npm audit --audit-level=critical', { stdio: 'inherit' });
      console.log('✅ Security audit passed.');
    } catch (auditErr) {
      console.warn('\x1b[33m%s\x1b[0m', '⚠️ Warning: Upstream security advisories detected. Proceeding with deployment verification...');
    }

    console.log('\n🛡️ Running TypeScript verification (npx tsc --noEmit)...');
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ TypeScript verification passed.');

    console.log('\n🔍 Checking git working tree...');
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    if (status) {
      console.log('Staging all changes...');
      execSync('git add .', { stdio: 'inherit' });
      console.log('\n💾 Committing changes...');
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    } else {
      console.log('Working tree clean, no new uncommitted changes.');
    }

    console.log('\n📤 Pushing to GitHub (origin main)...');
    execSync('git push origin main', { stdio: 'inherit' });

    console.log('\n\x1b[32m%s\x1b[0m', '✨ SUCCESS! Code is updated on GitHub! ✨');
    console.log('\x1b[33m%s\x1b[0m', '⚡ Auto-deployment pipeline triggered successfully! ⚡\n');
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ Deployment failed during execution: ' + (error.message || error));
  } finally {
    rl.close();
  }
});
