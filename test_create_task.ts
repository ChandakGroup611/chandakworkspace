import { createTask } from './lib/actions/tasks';

async function test() {
  try {
    const res = await createTask({
      workspace_id: '12345678-1234-1234-1234-123456789012',
      title: 'Test task',
      description: 'Test description',
      priority_id: '12345678-1234-1234-1234-123456789012',
      created_by: '12345678-1234-1234-1234-123456789012',
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
