const fs = require('fs'); const content = fs.readFileSync('hooks/useLocalReportConfig.ts', 'utf8'); console.log(content.includes('localStorage.removeItem'));
