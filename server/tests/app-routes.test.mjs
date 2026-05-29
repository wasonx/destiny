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

test('generate route fills missing ai report fields from fallback structure', async () => {
  const aiServer = await new Promise((resolve) => {
    const server = createApp({
      config: loadConfig({ DEEPSEEK_API_KEY: '', DEEPSEEK_MODEL: 'mock' }),
    }).listen(0, () => resolve(server));
  });
  const aiPort = aiServer.address().port;
  aiServer.removeAllListeners('request');
  aiServer.on('request', (_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'AI 摘要' }) } }] }));
  });

  const app = createApp({
    config: loadConfig({
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_MODEL: 'mock',
      DEEPSEEK_API_URL: `http://127.0.0.1:${aiPort}`,
    }),
  });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'space', payload: { focus: '房屋朝向' } }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.report.title, '安居 · 环境分析');
    assert.equal(data.report.summary, 'AI 摘要');
    assert.ok(Array.isArray(data.report.sections));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => aiServer.close(resolve));
  }
});
