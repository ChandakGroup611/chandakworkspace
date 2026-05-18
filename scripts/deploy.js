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
    console.log('\n🔍 Staging all changes...');
    execSync('git add .', { stdio: 'inherit' });

    console.log('\n💾 Committing changes...');
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

    console.log('\n📤 Pushing to GitHub (origin main)...');
    execSync('git push origin main', { stdio: 'inherit' });

    console.log('\n\x1b[32m%s\x1b[0m', '✨ SUCCESS! Code is updated on GitHub! ✨');
    console.log('\x1b[33m%s\x1b[0m', '⚡ Vercel is now automatically compiling and deploying your changes live! ⚡\n');
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ Deployment failed during execution. Please check the Git logs above.');
  } finally {
    rl.close();
  }
});
