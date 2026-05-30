function compactList(value) {
  return Array.isArray(value) ? value.filter(Boolean).map((item) => String(item)) : [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function templateRuleIds(templateScope) {
  return compactList(templateScope?.rule_ids || templateScope?.ruleIds || []);
}

export function createPublishingGraphSyncService({ graphDriver = null, database = 'neo4j' } = {}) {
  async function runSync(type, item) {
    if (!graphDriver || !item?.id) {
      return { ok: false, skipped: true };
    }
    const session = graphDriver.session({ database });
    try {
      if (type === 'knowledge') {
        await syncKnowledge(session, item);
      } else if (type === 'rule') {
        await syncRule(session, item);
      } else if (type === 'template') {
        await syncTemplate(session, item);
      } else {
        throw new Error(`UNKNOWN_GRAPH_SYNC_TYPE:${type}`);
      }
      return { ok: true };
    } finally {
      await session.close();
    }
  }

  return {
    syncPublishedItem: runSync,
  };
}

async function syncKnowledge(session, item) {
  await session.run(
    `
      merge (k:Knowledge {id: $id})
      set k.title = $title,
          k.module = $module,
          k.status = $status,
          k.versionNo = $versionNo,
          k.sourceNote = $sourceNote,
          k.updatedAt = datetime()
      with k
      optional match (k)-[old:EXPLAINS|HAS_SOURCE]->()
      delete old
      with k
      foreach (conceptKey in $conceptKeys |
        merge (c:Concept {key: conceptKey})
        merge (k)-[:EXPLAINS]->(c)
      )
      foreach (_ in case when $sourceNote <> '' then [1] else [] end |
        merge (s:Source {id: $sourceId})
        set s.note = $sourceNote
        merge (k)-[:HAS_SOURCE]->(s)
      )
      return k
    `,
    {
      id: item.id,
      module: normalizeText(item.module || 'bazi'),
      title: normalizeText(item.title || item.id),
      status: normalizeText(item.status || 'published'),
      versionNo: Number(item.version_no || item.versionNo || 0),
      conceptKeys: compactList(item.concept_keys || item.conceptKeys),
      sourceNote: normalizeText(item.source_note || item.sourceNote),
      sourceId: `source:${item.id}`,
    },
  );
}

async function syncRule(session, item) {
  await session.run(
    `
      merge (r:Rule {id: $id})
      set r.name = $name,
          r.module = $module,
          r.status = $status,
          r.versionNo = $versionNo,
          r.riskBoundary = $riskBoundary,
          r.updatedAt = datetime()
      with r
      optional match (r)-[old:USES|REFERENCES_CONCEPT|HAS_RISK_BOUNDARY]->()
      delete old
      with r
      foreach (knowledgeId in $knowledgeEntryIds |
        merge (k:Knowledge {id: knowledgeId})
        merge (r)-[:USES]->(k)
      )
      foreach (conceptKey in $graphNodeKeys |
        merge (c:Concept {key: conceptKey})
        merge (r)-[:REFERENCES_CONCEPT]->(c)
      )
      foreach (_ in case when $riskBoundary <> '' then [1] else [] end |
        merge (risk:RiskBoundary {id: $riskId})
        set risk.note = $riskBoundary
        merge (r)-[:HAS_RISK_BOUNDARY]->(risk)
      )
      return r
    `,
    {
      id: item.id,
      module: normalizeText(item.module || 'bazi'),
      name: normalizeText(item.name || item.id),
      status: normalizeText(item.status || 'published'),
      versionNo: Number(item.version_no || item.versionNo || 0),
      riskBoundary: normalizeText(item.risk_boundary || item.riskBoundary),
      riskId: `risk:rule:${item.id}`,
      knowledgeEntryIds: compactList(item.knowledge_entry_ids || item.knowledgeEntryIds),
      graphNodeKeys: compactList(item.graph_node_keys || item.graphNodeKeys),
    },
  );
}

async function syncTemplate(session, item) {
  await session.run(
    `
      merge (t:Template {id: $id})
      set t.name = $name,
          t.module = $module,
          t.reportKind = $reportKind,
          t.status = $status,
          t.versionNo = $versionNo,
          t.riskBoundary = $riskBoundary,
          t.updatedAt = datetime()
      with t
      optional match (t)-[old:TRIGGERS|HAS_RISK_BOUNDARY]->()
      delete old
      with t
      foreach (ruleId in $ruleIds |
        merge (r:Rule {id: ruleId})
        merge (t)-[:TRIGGERS]->(r)
      )
      foreach (_ in case when $riskBoundary <> '' then [1] else [] end |
        merge (risk:RiskBoundary {id: $riskId})
        set risk.note = $riskBoundary
        merge (t)-[:HAS_RISK_BOUNDARY]->(risk)
      )
      return t
    `,
    {
      id: item.id,
      module: normalizeText(item.module || 'bazi'),
      name: normalizeText(item.name || item.id),
      reportKind: normalizeText(item.report_kind || item.reportKind),
      status: normalizeText(item.status || 'published'),
      versionNo: Number(item.version_no || item.versionNo || 0),
      riskBoundary: normalizeText(item.risk_boundary || item.riskBoundary),
      riskId: `risk:template:${item.id}`,
      ruleIds: templateRuleIds(item.template_scope || item.templateScope),
    },
  );
}
