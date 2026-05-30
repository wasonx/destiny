import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  earthlyBranches,
  fiveElements,
  heavenlyStems,
  tenGods,
} from '../graph/bazi-seed-data.mjs';
import { summarizeBirthInput, summarizeFourPillars } from '../rules/bazi-features.mjs';

test('bazi seed data includes core ontology counts', () => {
  assert.equal(heavenlyStems.length, 10);
  assert.equal(earthlyBranches.length, 12);
  assert.equal(fiveElements.length, 5);
  assert.equal(tenGods.length, 10);
});

test('birth date and time can be converted to four pillars', () => {
  const summary = summarizeBirthInput({
    birthdate: '1999-06-07',
    birthtime: '09:11',
  });

  assert.deepEqual(summary.pillars, ['己卯', '庚午', '庚寅', '辛巳']);
  assert.equal(summary.dayStem, '庚');
  assert.equal(summary.warnings.length, 0);
});

test('four pillars summary counts stem and branch elements', () => {
  const summary = summarizeFourPillars({
    year: { stem: '甲', branch: '子' },
    month: { stem: '丙', branch: '寅' },
    day: { stem: '戊', branch: '辰' },
    hour: { stem: '庚', branch: '申' },
  });

  assert.deepEqual(summary.pillars, ['甲子', '丙寅', '戊辰', '庚申']);
  assert.deepEqual(summary.elements, { 木: 2, 火: 1, 土: 2, 金: 2, 水: 1 });
  assert.deepEqual(summary.warnings, []);
});
