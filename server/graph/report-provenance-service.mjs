export function buildReportProvenance({ graph = { nodes: [], edges: [] }, context = {}, safety = {} } = {}) {
  const hasExplicitGraph = Boolean((graph.nodes || []).length || (graph.edges || []).length);
  const derivedGraph = hasExplicitGraph ? { nodes: [], edges: [] } : buildContextGraph(context);
  const graphNodes = dedupeById([...(graph.nodes || []), ...derivedGraph.nodes]);
  const graphEdges = dedupeById([...(graph.edges || []), ...derivedGraph.edges]);
  return {
    graphNodes,
    graphEdges,
    ruleHits: context.rules || [],
    knowledgeSources: context.knowledge || [],
    templateSnapshot: context.template || {},
    safetySnapshot: safety || {},
  };
}

function graphNode(id, type, label, metadata = {}) {
  return { id, type, label, metadata };
}

function graphEdge(source, target, type, label = type, metadata = {}) {
  return { id: `${source}->${target}:${type}`, source, target, type, label, metadata };
}

function conceptLabel(key) {
  const labels = {
    wood: '木',
    fire: '火',
    earth: '土',
    metal: '金',
    water: '水',
  };
  return labels[key] || key;
}

function dedupeById(items) {
  return [...new Map(items.filter(Boolean).map((item) => [item.id, item])).values()];
}

function buildContextGraph(context = {}) {
  const nodes = [];
  const edges = [];
  const rules = context.rules || [];
  const knowledge = context.knowledge || [];
  const template = context.template || null;

  for (const item of knowledge) {
    const knowledgeId = `knowledge:${item.id}`;
    nodes.push(graphNode(knowledgeId, 'Knowledge', item.title || item.id, { versionNo: item.version_no, sourceNote: item.source_note || '' }));
    for (const key of item.concept_keys || []) {
      const conceptId = `concept:${key}`;
      nodes.push(graphNode(conceptId, 'Concept', conceptLabel(key), { key }));
      edges.push(graphEdge(knowledgeId, conceptId, 'EXPLAINS', '解释'));
    }
  }

  for (const item of rules) {
    const ruleId = `rule:${item.id}`;
    nodes.push(graphNode(ruleId, 'Rule', item.name || item.id, { versionNo: item.version_no, priority: item.priority, weight: item.weight }));
    for (const knowledgeId of item.knowledge_entry_ids || []) {
      const targetId = `knowledge:${knowledgeId}`;
      nodes.push(graphNode(targetId, 'Knowledge', knowledgeId, {}));
      edges.push(graphEdge(ruleId, targetId, 'USES', '引用知识'));
    }
    for (const key of item.graph_node_keys || []) {
      const conceptId = `concept:${key}`;
      nodes.push(graphNode(conceptId, 'Concept', conceptLabel(key), { key }));
      edges.push(graphEdge(ruleId, conceptId, 'REFERENCES_CONCEPT', '关联概念'));
    }
    if (item.risk_boundary) {
      const riskId = `risk:rule:${item.id}`;
      nodes.push(graphNode(riskId, 'RiskBoundary', item.risk_boundary, {}));
      edges.push(graphEdge(riskId, ruleId, 'CONSTRAINS', '约束'));
    }
  }

  if (template?.id) {
    const templateId = `template:${template.id}`;
    nodes.push(graphNode(templateId, 'Template', template.name || template.id, { versionNo: template.version_no, reportKind: template.report_kind }));
    for (const ruleId of template.template_scope?.rule_ids || []) {
      const targetId = `rule:${ruleId}`;
      nodes.push(graphNode(targetId, 'Rule', ruleId, {}));
      edges.push(graphEdge(templateId, targetId, 'TRIGGERS', '关联规则'));
    }
    if (template.risk_boundary) {
      const riskId = `risk:template:${template.id}`;
      nodes.push(graphNode(riskId, 'RiskBoundary', template.risk_boundary, {}));
      edges.push(graphEdge(templateId, riskId, 'USES_RISK_BOUNDARY', '使用风险边界'));
    }
  }

  return {
    nodes: dedupeById(nodes),
    edges: dedupeById(edges),
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
      JSON.stringify(provenance.graphNodes || []),
      JSON.stringify(provenance.graphEdges || []),
      JSON.stringify(provenance.ruleHits || []),
      JSON.stringify(provenance.knowledgeSources || []),
      JSON.stringify(provenance.templateSnapshot || {}),
      JSON.stringify(provenance.safetySnapshot || {}),
    ],
  );
  await client.query('update app.report_runs set provenance = $2 where id = $1', [reportRunId, JSON.stringify(provenance || {})]);
}
