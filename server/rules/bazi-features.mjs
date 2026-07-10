import { earthlyBranches, heavenlyStems } from '../graph/bazi-seed-data.mjs';
import lunar from 'lunar-javascript';

const { Solar } = lunar;

const stemElement = Object.fromEntries(heavenlyStems.map((stem) => [stem.label, stem.element]));
const branchElement = Object.fromEntries(earthlyBranches.map((branch) => [branch.label, branch.element]));

function addElement(summary, element) {
  if (!element) return;
  summary[element] = (summary[element] || 0) + 1;
}

export function summarizeFourPillars(input) {
  const warnings = [];
  const elements = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const order = ['year', 'month', 'day', 'hour'];
  const pillars = [];

  for (const key of order) {
    const pillar = input?.[key] || {};
    if (!stemElement[pillar.stem] || !branchElement[pillar.branch]) {
      warnings.push(`${key} pillar is incomplete`);
      continue;
    }

    pillars.push(`${pillar.stem}${pillar.branch}`);
    addElement(elements, stemElement[pillar.stem]);
    addElement(elements, branchElement[pillar.branch]);
  }

  return {
    pillars,
    elements,
    warnings,
    dayStem: input?.day?.stem || '',
  };
}

function parseDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hour: 12, minute: 0, warning: 'birthtime is missing or invalid; defaulted to noon' };
  }
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    warning: '',
  };
}

function splitPillar(value) {
  const text = String(value || '');
  return {
    stem: text.slice(0, 1),
    branch: text.slice(1, 2),
  };
}

export function summarizeBirthInput(input = {}) {
  const warnings = [];
  const date = parseDate(input.birthdate);
  if (!date) {
    return {
      pillars: [],
      elements: { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 },
      warnings: ['birthdate is missing or invalid'],
      dayStem: '',
    };
  }

  const time = parseTime(input.birthtime);
  if (time.warning) warnings.push(time.warning);

  const eightChar = Solar
    .fromYmdHms(date.year, date.month, date.day, time.hour, time.minute, 0)
    .getLunar()
    .getEightChar();
  const summary = summarizeFourPillars({
    year: splitPillar(eightChar.getYear()),
    month: splitPillar(eightChar.getMonth()),
    day: splitPillar(eightChar.getDay()),
    hour: splitPillar(eightChar.getTime()),
  });

  return {
    ...summary,
    warnings: [...warnings, ...summary.warnings],
  };
}

const generateOrder = ['木', '火', '土', '金', '水']; // 木生火→土→金→水→木
const controlOrder = ['木', '土', '水', '火', '金']; // 木克土→水→火→金→木

function stemToElement(stem) {
  return stemElement[stem] || '';
}

// 以"我"(selfStem) 为视角，描述对方(otherStem) 与我的生克关系
function stemRelation(selfStem, otherStem) {
  const a = stemToElement(selfStem);
  const b = stemToElement(otherStem);
  if (!a || !b) return '暂缺';
  if (a === b) return '同气比和';
  const genIdx = generateOrder.indexOf(a);
  if (generateOrder[(genIdx + 1) % 5] === b) return '对方生我（助益）';
  if (generateOrder[(genIdx + 4) % 5] === b) return '我生对方（付出）';
  const conIdx = controlOrder.indexOf(a);
  if (controlOrder[(conIdx + 1) % 5] === b) return '我克对方（主导）';
  if (controlOrder[(conIdx + 4) % 5] === b) return '对方克我（压力）';
  return '相制';
}

export function summarizeRelationship(selfInput = {}, otherInput = {}) {
  const self = summarizeBirthInput(selfInput);
  const other = summarizeBirthInput(otherInput);
  const combined = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const k of ['木', '火', '土', '金', '水']) {
    combined[k] = (self.elements[k] || 0) + (other.elements[k] || 0);
  }
  return {
    selfPillars: self.pillars,
    otherPillars: other.pillars,
    selfElements: self.elements,
    otherElements: other.elements,
    combinedElements: combined,
    dayStemRelation: stemRelation(self.dayStem, other.dayStem),
    warnings: [...self.warnings, ...other.warnings],
  };
}
