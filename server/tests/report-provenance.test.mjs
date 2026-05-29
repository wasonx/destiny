import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('report provenance migration adds provenance storage', () => {
  const sql = readFileSync(new URL('../db/migrations/009_phase9_report_provenance.sql', import.meta.url), 'utf8');

  assert.match(sql, /alter table app\.report_runs/i);
  assert.match(sql, /add column if not exists provenance jsonb/i);
  assert.match(sql, /create table if not exists app\.report_provenance_records/i);
  assert.match(sql, /graph_nodes jsonb/i);
  assert.match(sql, /graph_edges jsonb/i);
  assert.match(sql, /rule_hits jsonb/i);
  assert.match(sql, /knowledge_sources jsonb/i);
});
