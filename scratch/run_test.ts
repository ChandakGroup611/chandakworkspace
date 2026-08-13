import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const { dispatchNotification } = await import('../lib/actions/notifications');
  console.log('Dispatching...');
  try {
    await dispatchNotification(
      'ed3ce963-afae-4777-9d61-d9d8c758e5cd', 
      'Task Executor Assignment', 
      'You have been assigned as executor on task', 
      '/tasks/test', 
      'TASK', 
      'EXECUTOR_ASSIGNED'
    );
    console.log('Dispatch complete.');
  } catch (e) {
    console.error('Failed to dispatch:', e);
  }
}

run();
