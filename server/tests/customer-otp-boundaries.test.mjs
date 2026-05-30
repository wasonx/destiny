import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createApp } from '../app.mjs';
import { loadConfig } from '../config.mjs';

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function hashOtp(phone, code) {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

test('sms mock boundary migration creates delivery log storage and indexes', () => {
  const migration = readFileSync(new URL('../db/migrations/011_phase11_sms_mock_boundaries.sql', import.meta.url), 'utf8');

  assert.match(migration, /create table if not exists app\.sms_delivery_logs/i);
  assert.match(migration, /template_id text/i);
  assert.match(migration, /sign_name text/i);
  assert.match(migration, /sms_otp_challenges_phone_created_idx/i);
});

test('mock OTP send records provider boundary and enforces cooldown', async () => {
  const queries = [];
  let sends = 0;
  const pool = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (text.includes('count(*)') && text.includes('from app.sms_otp_challenges')) {
        return { rows: [{ send_count: sends }], rowCount: 1 };
      }
      if (text.includes('insert into app.sms_otp_challenges')) {
        sends += 1;
        return { rows: [{ id: `challenge-${sends}` }], rowCount: 1 };
      }
      if (text.includes('insert into app.sms_delivery_logs')) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
  const app = createApp({
    config: loadConfig({
      SESSION_SECRET: 'test-secret',
      SMS_SEND_COOLDOWN_SECONDS: '60',
      TENCENT_SMS_LOGIN_TEMPLATE_ID: 'login-template',
      TENCENT_SMS_SIGN_NAME: '甄算',
    }),
    pool,
  });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const first = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800000000' }),
    });
    const firstData = await first.json();
    assert.equal(first.status, 200);
    assert.equal(firstData.provider, 'mock');
    assert.equal(firstData.devCode, '246810');

    const second = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800000000' }),
    });
    assert.equal(second.status, 429);
    assert.deepEqual(await second.json(), { error: 'OTP_SEND_TOO_FREQUENT' });

    assert.ok(queries.some((query) => query.sql.includes('insert into app.sms_delivery_logs')));
    assert.ok(queries.some((query) => query.sql.includes('template_id') && query.params.includes('login-template')));
    assert.ok(queries.every((query) => !query.sql.includes('tencentcloud') && !query.sql.includes('sendsms')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('mock OTP verify increments failed attempts and blocks after limit', async () => {
  const queries = [];
  const challenge = {
    id: 'challenge-1',
    code_hash: hashOtp('13800000000', '246810'),
    attempts: 0,
  };
  const client = {
    async query(sql, params = []) {
      const text = normalizeSql(sql);
      queries.push({ sql: text, params });
      if (['begin', 'commit', 'rollback'].includes(text)) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('from app.sms_otp_challenges') && text.includes('for update')) {
        return { rows: [{ ...challenge }], rowCount: 1 };
      }
      if (text.includes('update app.sms_otp_challenges') && text.includes('attempts = attempts + 1')) {
        challenge.attempts += 1;
        return { rows: [{ attempts: challenge.attempts }], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
    release() {},
  };
  const app = createApp({
    config: loadConfig({
      SESSION_SECRET: 'test-secret',
      SMS_OTP_MAX_ATTEMPTS: '2',
    }),
    pool: { connect: async () => client },
  });
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const first = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800000000', code: '111111' }),
    });
    assert.equal(first.status, 400);
    assert.deepEqual(await first.json(), { error: 'INVALID_CODE' });

    const second = await fetch(`http://127.0.0.1:${port}/destiny-api/customer/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800000000', code: '222222' }),
    });
    assert.equal(second.status, 429);
    assert.deepEqual(await second.json(), { error: 'OTP_ATTEMPTS_EXCEEDED' });

    assert.equal(challenge.attempts, 2);
    assert.ok(queries.some((query) => query.sql.includes('attempts = attempts + 1')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
