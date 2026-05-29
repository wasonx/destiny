export function buildReportContext({ input = {}, features = {}, rules = [], knowledge = [], template = null } = {}) {
  return {
    input,
    features,
    rules,
    knowledge,
    template,
  };
}
