import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

test('health route returns configured model state', async () => {
  const app = createApp({ config: loadConfig({ DEEPSEEK_API_KEY: '', DEEPSEEK_MODEL: 'deepseek-chat' }) });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      model: 'deepseek-chat',
      hasKey: false,
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('admin route modules are mounted', async () => {
  const app = createApp({ config: loadConfig({}) });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/admin/ops/health`);
    assert.notEqual(response.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
