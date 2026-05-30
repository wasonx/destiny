export function buildReportContext({ input = {}, features = {}, rules = [], knowledge = [], template = null, graph } = {}) {
  const context = {
    input,
    features,
    rules,
    knowledge,
    template,
  };
  if (graph) {
    context.graph = graph;
  }
  return context;
}
