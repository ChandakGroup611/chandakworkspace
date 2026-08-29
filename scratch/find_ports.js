const { execSync } = require('child_process');

try {
  const netstat = execSync('netstat -ano').toString();
  const lines = netstat.split('\n');
  const listenLines = lines.filter(l => l.includes('LISTENING'));
  console.log("Listening ports:");
  listenLines.forEach(l => {
    const parts = l.trim().split(/\s+/);
    if (parts.length >= 5) {
      const addr = parts[1];
      const pid = parts[4];
      console.log(`Port ${addr} is owned by PID ${pid}`);
    }
  });
} catch (e) {
  console.error(e);
}
