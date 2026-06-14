import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVisibleUsers } from './lib/repositories/users';

async function test() {
  const users = await getVisibleUsers('53b7dbae-6049-44a7-a9c1-4ba769b4c324');
  console.log('Visible users count:', users.length);
}

test().catch(console.error);
