import { branchConflicts, earthlyBranches, elementCycles, fiveElements, heavenlyStems, tenGods } from './bazi-seed-data.mjs';

const conceptRows = [
  ...fiveElements.map((item) => ({ ...item, conceptType: '五行' })),
  ...heavenlyStems.map((item) => ({ ...item, conceptType: '天干' })),
  ...earthlyBranches.map((item) => ({ ...item, conceptType: '地支' })),
  ...tenGods.map((item) => ({ ...item, conceptType: '十神' })),
];

function conceptId(key) {
  return `concept:${key}`;
}

function node(id, type, label, metadata = {}) {
  return { id, type, label, metadata };
}

function edge(source, target, type, label = type, metadata = {}) {
  return { id: `${source}->${target}:${type}`, source, target, type, label, metadata };
}

export function createGraphQueryService({ graphDriver = null, database = 'neo4j' } = {}) {
  void graphDriver;
  void database;

  return {
    async getConceptGraph(key, { depth = 2 } = {}) {
      return getFallbackConceptGraph(key, { depth });
    },
    async getKnowledgeGraph(id, { pool } = {}) {
      const result = await pool.query('select * from app.knowledge_entries where id = $1', [id]);
      const item = result.rows[0];
      if (!item) {
        throw new Error('KNOWLEDGE_NOT_FOUND');
      }

      const focus = node(`knowledge:${item.id}`, 'Knowledge', item.title, { tags: item.tags || [], sourceNote: item.source_note || '' });
      const nodes = [focus];
      const edges = [];
      for (const key of item.concept_keys || []) {
        const concept = findConcept(key);
        const target = node(conceptId(concept.key), 'Concept', concept.label, { conceptType: concept.conceptType });
        nodes.push(target);
        edges.push(edge(focus.id, target.id, 'EXPLAINS', '解释'));
      }
      return dedupeGraph({ focus, nodes, edges });
    },
    async getRuleGraph(id, { pool } = {}) {
      const result = await pool.query('select * from app.analysis_rules where id = $1', [id]);
      const item = result.rows[0];
      if (!item) {
        throw new Error('RULE_NOT_FOUND');
      }

      const focus = node(`rule:${item.id}`, 'Rule', item.name, { riskBoundary: item.risk_boundary || '' });
      const nodes = [focus];
      const edges = [];
      for (const knowledgeId of item.knowledge_entry_ids || []) {
        const target = node(`knowledge:${knowledgeId}`, 'Knowledge', knowledgeId, {});
        nodes.push(target);
        edges.push(edge(focus.id, target.id, 'USES', '引用知识'));
      }
      for (const key of item.graph_node_keys || []) {
        const concept = findConcept(key);
        const target = node(conceptId(concept.key), 'Concept', concept.label, { conceptType: concept.conceptType });
        nodes.push(target);
        edges.push(edge(focus.id, target.id, 'REFERENCES_CONCEPT', '关联概念'));
      }
      if (item.risk_boundary) {
        const risk = node(`risk:${item.id}`, 'RiskBoundary', item.risk_boundary, {});
        nodes.push(risk);
        edges.push(edge(risk.id, focus.id, 'CONSTRAINS', '约束'));
      }
      return dedupeGraph({ focus, nodes, edges });
    },
    async getTemplateGraph(id, { pool } = {}) {
      const result = await pool.query('select * from app.report_templates where id = $1', [id]);
      const item = result.rows[0];
      if (!item) {
        throw new Error('TEMPLATE_NOT_FOUND');
      }

      const focus = node(`template:${item.id}`, 'Template', item.name, { reportKind: item.report_kind });
      const nodes = [focus];
      const edges = [];
      for (const ruleId of item.template_scope?.rule_ids || []) {
        const target = node(`rule:${ruleId}`, 'Rule', ruleId, {});
        nodes.push(target);
        edges.push(edge(focus.id, target.id, 'TRIGGERS', '关联规则'));
      }
      if (item.risk_boundary) {
        const risk = node(`risk:template:${item.id}`, 'RiskBoundary', item.risk_boundary, {});
        nodes.push(risk);
        edges.push(edge(focus.id, risk.id, 'USES_RISK_BOUNDARY', '使用风险边界'));
      }
      return dedupeGraph({ focus, nodes, edges });
    },
    async getReportGraph(id, { pool } = {}) {
      const result = await pool.query(
        `
          select *
          from app.report_provenance_records
          where report_run_id = $1
          order by created_at desc
          limit 1
        `,
        [id],
      );
      const item = result.rows[0] || {};
      const focus = node(`report:${id}`, 'Report', `报告 ${id}`, {});
      const nodes = [focus, ...(item.graph_nodes || [])];
      const edges = [...(item.graph_edges || [])];
      for (const rule of item.rule_hits || []) {
        const target = node(`rule:${rule.id}`, 'Rule', rule.name || rule.id, { versionNo: rule.version_no });
        nodes.push(target);
        edges.push(edge(focus.id, target.id, 'HIT_RULE', '命中规则'));
      }
      for (const knowledge of item.knowledge_sources || []) {
        const target = node(`knowledge:${knowledge.id}`, 'Knowledge', knowledge.title || knowledge.id, { versionNo: knowledge.version_no });
        nodes.push(target);
        edges.push(edge(focus.id, target.id, 'USED_KNOWLEDGE', '使用知识'));
      }
      if (item.template_snapshot?.id) {
        const target = node(`template:${item.template_snapshot.id}`, 'Template', item.template_snapshot.name || item.template_snapshot.id, { versionNo: item.template_snapshot.version_no });
        nodes.push(target);
        edges.push(edge(focus.id, target.id, 'USED_TEMPLATE', '使用模板'));
      }
      return dedupeGraph({ focus, nodes, edges });
    },
  };
}

function findConcept(keyOrLabel) {
  return conceptRows.find((item) => item.key === keyOrLabel || item.label === keyOrLabel) || { key: keyOrLabel, label: keyOrLabel, conceptType: '概念' };
}

function getFallbackConceptGraph(keyOrLabel, { depth = 2 } = {}) {
  const focusConcept = findConcept(keyOrLabel);
  const nodes = conceptRows.map((item) => node(conceptId(item.key), 'Concept', item.label, { conceptType: item.conceptType }));
  const labelToKey = new Map(conceptRows.map((item) => [item.label, item.key]));
  const edges = [
    ...elementCycles.generates.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'GENERATES', '相生')),
    ...elementCycles.restrains.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'RESTRAINS', '相克')),
    ...branchConflicts.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'CONFLICTS_WITH', '相冲')),
  ].filter((item) => !item.source.includes('undefined') && !item.target.includes('undefined'));
  const focus = node(conceptId(focusConcept.key), 'Concept', focusConcept.label, { conceptType: focusConcept.conceptType });
  return limitGraphByDepth(dedupeGraph({ focus, nodes, edges }), depth);
}

function dedupeGraph({ focus, nodes, edges }) {
  return {
    focus,
    nodes: [...new Map(nodes.map((item) => [item.id, item])).values()],
    edges: [...new Map(edges.map((item) => [item.id, item])).values()],
  };
}

function limitGraphByDepth(graph, depth) {
  const maxDepth = Math.max(1, Math.min(3, Number.parseInt(String(depth), 10) || 2));
  const adjacency = new Map();
  for (const edgeItem of graph.edges) {
    if (!adjacency.has(edgeItem.source)) adjacency.set(edgeItem.source, new Set());
    if (!adjacency.has(edgeItem.target)) adjacency.set(edgeItem.target, new Set());
    adjacency.get(edgeItem.source).add(edgeItem.target);
    adjacency.get(edgeItem.target).add(edgeItem.source);
  }

  const visible = new Set([graph.focus.id]);
  const distances = new Map([[graph.focus.id, 0]]);
  const queue = [{ id: graph.focus.id, distance: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.distance >= maxDepth) continue;
    for (const next of adjacency.get(current.id) || []) {
      if (visible.has(next)) continue;
      visible.add(next);
      const distance = current.distance + 1;
      distances.set(next, distance);
      queue.push({ id: next, distance });
    }
  }

  return {
    focus: graph.focus,
    nodes: graph.nodes.filter((item) => visible.has(item.id)),
    edges: graph.edges.filter((item) => {
      const sourceDistance = distances.get(item.source);
      const targetDistance = distances.get(item.target);
      return (
        sourceDistance !== undefined
        && targetDistance !== undefined
        && sourceDistance <= maxDepth
        && targetDistance <= maxDepth
        && Math.min(sourceDistance, targetDistance) < maxDepth
      );
    }),
  };
}
