const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\AvinashPise\\.gemini\\antigravity-ide\\brain\\bf52885d-3044-408f-8f44-2981bd12a6f8\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT') {
        console.log(`[USER_INPUT #${obj.step_index}]:`, obj.content?.substring(0, 300));
      }
    } catch(e) {}
  }
}

main().catch(console.error);
