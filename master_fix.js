const { execSync } = require('child_process');

try {
  execSync('node rebuild_from_scripts.js', { stdio: 'inherit' });
  execSync('node final_fix_safely.js', { stdio: 'inherit' });
  execSync('node final_ts_fix.js', { stdio: 'inherit' });
  execSync('node auto_balance.js', { stdio: 'inherit' });
  execSync('node debug_jsx.js', { stdio: 'inherit' });
} catch (e) {
  console.log("Error:", e.message);
}
