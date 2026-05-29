import { evaluateCondition } from './condition-evaluator.mjs';

export function runRules(rules = [], facts = {}) {
  return rules
    .filter((rule) => evaluateCondition(rule.condition, facts))
    .sort((a, b) => {
      const priority = Number(a.priority || 0) - Number(b.priority || 0);
      if (priority !== 0) return priority;
      return Number(b.weight || 0) - Number(a.weight || 0);
    });
}
