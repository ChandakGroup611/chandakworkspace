import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { POST } from '../app/api/cron/process-email-queue/route';

async function run() {
  console.log('Running queue...');
  try {
    const res = await POST(new Request('http://localhost:3000'));
    const json = await res.json();
    console.log('Result:', json);
  } catch (e) {
    console.error('Failed to run queue:', e);
  }
}

run();
