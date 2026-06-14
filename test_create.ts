import { createRequirement } from './lib/actions/requirements';
async function run() {
  try {
    const res = await createRequirement({
      workspace_id: 'test-ws-id',
      title: 'Test',
      objective: 'Obj',
      functional_scope: 'Func',
      created_by: 'c905b682-1bf7-4e36-bceb-24036ab075bd'
    });
    console.log('Success:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
