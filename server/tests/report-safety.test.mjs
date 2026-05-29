import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReportContext } from '../reports/context-builder.mjs';
import { reviewReportSafety } from '../reports/safety-review.mjs';

test('report context keeps inputs, features, rules, knowledge and template', () => {
  const context = buildReportContext({
    input: { concern: '事业' },
    features: { dayStem: '甲' },
    rules: [{ id: 'r1', name: '木旺', conclusion: '行动力强' }],
    knowledge: [{ id: 'k1', title: '甲木基础' }],
    template: { name: '基础模板' },
  });

  assert.deepEqual(Object.keys(context), ['input', 'features', 'rules', 'knowledge', 'template']);
});

test('safety review flags absolute high-risk claims', () => {
  const result = reviewReportSafety('你一定会改命转运。');

  assert.equal(result.passed, false);
  assert.deepEqual(result.flags, ['absolute_claim']);
});
