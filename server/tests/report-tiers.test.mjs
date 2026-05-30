import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('report tier migration adds free and full report marker', async () => {
  const sql = await readFile(new URL('../db/migrations/010_phase10_report_tiers.sql', import.meta.url), 'utf8');

  assert.match(sql, /add column if not exists report_tier/i);
  assert.match(sql, /'free'/);
  assert.match(sql, /'full'/);
  assert.match(sql, /report_runs_report_tier_idx/i);
});
