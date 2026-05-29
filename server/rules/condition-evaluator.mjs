function getPathValue(source, path) {
  return String(path || '').split('.').reduce((value, key) => (value == null ? undefined : value[key]), source);
}

function compare(actual, operator, expected) {
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'includes':
      return Array.isArray(actual) ? actual.includes(expected) : String(actual || '').includes(String(expected));
    default:
      return false;
  }
}

export function evaluateCondition(condition = {}, facts = {}) {
  if (Array.isArray(condition.all)) {
    return condition.all.every((item) => evaluateCondition(item, facts));
  }
  if (Array.isArray(condition.any)) {
    return condition.any.some((item) => evaluateCondition(item, facts));
  }
  return compare(getPathValue(facts, condition.field), condition.operator, condition.value);
}
