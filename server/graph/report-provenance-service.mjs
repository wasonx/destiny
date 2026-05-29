export function buildReportProvenance({ graph = { nodes: [], edges: [] }, context = {}, safety = {} } = {}) {
  return {
    graphNodes: graph.nodes || [],
    graphEdges: graph.edges || [],
    ruleHits: context.rules || [],
    knowledgeSources: context.knowledge || [],
    templateSnapshot: context.template || {},
    safetySnapshot: safety || {},
  };
}

export async function saveReportProvenance(client, { reportRunId, provenance }) {
  await client.query(
    `
      insert into app.report_provenance_records(report_run_id, graph_nodes, graph_edges, rule_hits, knowledge_sources, template_snapshot, safety_snapshot)
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      reportRunId,
      provenance.graphNodes,
      provenance.graphEdges,
      provenance.ruleHits,
      provenance.knowledgeSources,
      provenance.templateSnapshot,
      provenance.safetySnapshot,
    ],
  );
  await client.query('update app.report_runs set provenance = $2 where id = $1', [reportRunId, provenance]);
}
