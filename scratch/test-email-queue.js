require('ts-node').register({ transpileOnly: true });
const { processEmailQueueAsync } = require('./lib/actions/email-queue.ts');

async function test() {
  console.log("Starting email queue processor...");
  await processEmailQueueAsync();
  console.log("Finished email queue processor.");
}

test();
