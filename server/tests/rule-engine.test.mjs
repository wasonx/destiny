import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateCondition } from '../rules/condition-evaluator.mjs';
import { runRules } from '../rules/rule-engine.mjs';

test('rule schema migration exists', () => {
  const sql = readFileSync(new URL('../db/migrations/003_phase3_rules_reports.sql', import.meta.url), 'utf8');

  assert.match(sql, /app\.analysis_rules/);
  assert.match(sql, /app\.report_templates/);
  assert.match(sql, /app\.report_runs/);
  assert.match(sql, /app\.safety_reviews/);
});

test('condition evaluator supports all, any and primitive operators', () => {
  const facts = { dayStem: '甲', elements: { 木: 3, 火: 1 }, tags: ['事业', '关系'] };

  assert.equal(evaluateCondition({ all: [{ field: 'elements.木', operator: 'gte', value: 2 }] }, facts), true);
  assert.equal(evaluateCondition({ any: [{ field: 'dayStem', operator: 'eq', value: '乙' }, { field: 'tags', operator: 'includes', value: '事业' }] }, facts), true);
  assert.equal(evaluateCondition({ field: 'elements.火', operator: 'lte', value: 0 }, facts), false);
});

test('rule engine returns matching rules in stable priority order', () => {
  const hits = runRules(
    [
      { id: 'late', priority: 20, weight: 10, condition: { field: 'dayStem', operator: 'eq', value: '甲' } },
      { id: 'heavy', priority: 10, weight: 20, condition: { field: 'dayStem', operator: 'eq', value: '甲' } },
      { id: 'light', priority: 10, weight: 5, condition: { field: 'dayStem', operator: 'eq', value: '甲' } },
    ],
    { dayStem: '甲' },
  );

  assert.deepEqual(hits.map((rule) => rule.id), ['heavy', 'light', 'late']);
});
