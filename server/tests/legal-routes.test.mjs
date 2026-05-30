import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

test('public legal route returns agreement privacy and report tier compliance documents', async () => {
  const app = createApp({ config: loadConfig({ SESSION_SECRET: 'test-secret' }) });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/destiny-api/legal`);
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.version, '2026-05-30');
    assert.equal(body.documents.userAgreement.title, '甄算用户协议');
    assert.equal(body.documents.privacyPolicy.title, '甄算隐私政策');
    assert.equal(body.documents.reportCompliance.title, '报告分层与风险边界说明');
    assert.ok(body.documents.userAgreement.sections.some((section) => section.heading === '服务性质'));
    assert.ok(body.documents.privacyPolicy.sections.some((section) => section.heading === '信息使用范围'));
    assert.ok(body.documents.reportCompliance.sections.some((section) => section.heading === '免费体验版'));
    assert.ok(body.documents.reportCompliance.sections.some((section) => section.heading === '付费完整版'));
    assert.match(JSON.stringify(body), /不提供医疗、投资、法律等确定性建议/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
