import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('publish workflow migration creates version tables and metadata fields', () => {
  const sql = readFileSync(new URL('../db/migrations/008_phase8_publish_workflow.sql', import.meta.url), 'utf8');

  assert.match(sql, /create table if not exists app\.analysis_rule_versions/i);
  assert.match(sql, /create table if not exists app\.report_template_versions/i);
  assert.match(sql, /alter table app\.analysis_rules/i);
  assert.match(sql, /alter table app\.report_templates/i);
  assert.match(sql, /change_summary/i);
  assert.match(sql, /version_no/i);
});
