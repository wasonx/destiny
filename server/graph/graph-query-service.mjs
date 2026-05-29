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
    async getConceptGraph(key) {
      return getFallbackConceptGraph(key);
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
  };
}

function findConcept(keyOrLabel) {
  return conceptRows.find((item) => item.key === keyOrLabel || item.label === keyOrLabel) || { key: keyOrLabel, label: keyOrLabel, conceptType: '概念' };
}

function getFallbackConceptGraph(keyOrLabel) {
  const focusConcept = findConcept(keyOrLabel);
  const nodes = conceptRows.map((item) => node(conceptId(item.key), 'Concept', item.label, { conceptType: item.conceptType }));
  const labelToKey = new Map(conceptRows.map((item) => [item.label, item.key]));
  const edges = [
    ...elementCycles.generates.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'GENERATES', '相生')),
    ...elementCycles.restrains.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'RESTRAINS', '相克')),
    ...branchConflicts.map(([from, to]) => edge(conceptId(labelToKey.get(from)), conceptId(labelToKey.get(to)), 'CONFLICTS_WITH', '相冲')),
  ].filter((item) => !item.source.includes('undefined') && !item.target.includes('undefined'));
  const focus = node(conceptId(focusConcept.key), 'Concept', focusConcept.label, { conceptType: focusConcept.conceptType });
  return dedupeGraph({ focus, nodes, edges });
}

function dedupeGraph({ focus, nodes, edges }) {
  return {
    focus,
    nodes: [...new Map(nodes.map((item) => [item.id, item])).values()],
    edges: [...new Map(edges.map((item) => [item.id, item])).values()],
  };
}
