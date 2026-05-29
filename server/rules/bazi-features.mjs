import { earthlyBranches, heavenlyStems } from '../graph/bazi-seed-data.mjs';

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
