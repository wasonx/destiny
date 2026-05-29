const types = {
  knowledge: {
    table: 'app.knowledge_entries',
    targetType: 'knowledge_entry',
  },
  rule: {
    table: 'app.analysis_rules',
    targetType: 'analysis_rule',
  },
  template: {
    table: 'app.report_templates',
    targetType: 'report_template',
  },
};

function getType(type) {
  const meta = types[type];
  if (!meta) {
    throw new Error(`UNKNOWN_PUBLISH_TYPE:${type}`);
  }
  return meta;
}

function normalizeSummary(changeSummary, fallback = '发布内容') {
  return String(changeSummary || '').trim() || fallback;
}

export async function publishItem(client, { type, id, actorUserId, changeSummary }) {
  const meta = getType(type);
  const summary = normalizeSummary(changeSummary);
  const current = await client.query(`select * from ${meta.table} where id = $1`, [id]);
  const item = current.rows[0];
  if (!item) {
    throw new Error('PUBLISH_TARGET_NOT_FOUND');
  }

  const nextVersion = Number(item.version_no || 0) + 1;
  const published = await client.query(
    `update ${meta.table} set status = 'published', version_no = $2, published_by = $3, published_at = now(), updated_at = now() where id = $1 returning *`,
    [id, nextVersion, actorUserId || null],
  );
  const version = await insertVersion(client, { type, item, nextVersion, actorUserId, changeSummary: summary });
  await writeAudit(client, {
    actorUserId,
    action: `${meta.targetType}.publish`,
    targetType: meta.targetType,
    targetId: id,
    metadata: { versionNo: nextVersion, changeSummary: summary },
  });

  return { item: published.rows[0], version: version.rows[0] };
}

export async function disableItem(client, { type, id, actorUserId, changeSummary }) {
  const meta = getType(type);
  const summary = normalizeSummary(changeSummary, '停用内容');
  const disabled = await client.query(`update ${meta.table} set status = 'disabled', updated_at = now() where id = $1 returning *`, [id]);
  if (!disabled.rowCount) {
    throw new Error('PUBLISH_TARGET_NOT_FOUND');
  }
  await writeAudit(client, {
    actorUserId,
    action: `${meta.targetType}.disable`,
    targetType: meta.targetType,
    targetId: id,
    metadata: { changeSummary: summary },
  });
  return { item: disabled.rows[0] };
}

async function insertVersion(client, { type, item, nextVersion, actorUserId, changeSummary }) {
  if (type === 'knowledge') {
    return client.query(
      `
        insert into app.knowledge_entry_versions(entry_id, version_no, title, summary, body, tags, risk_note, applicable_scope, concept_keys, source_note, published_by, change_summary)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning *
      `,
      [
        item.id,
        nextVersion,
        item.title,
        item.summary || '',
        item.body || '',
        item.tags || [],
        item.risk_note || '',
        item.applicable_scope || {},
        item.concept_keys || [],
        item.source_note || '',
        actorUserId || null,
        changeSummary,
      ],
    );
  }

  if (type === 'rule') {
    return client.query(
      `
        insert into app.analysis_rule_versions(rule_id, version_no, module, name, priority, weight, condition, conclusion, advice, risk_boundary, knowledge_entry_ids, graph_node_keys, trigger_explanation, published_by, change_summary)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        returning *
      `,
      [
        item.id,
        nextVersion,
        item.module,
        item.name,
        item.priority,
        item.weight,
        item.condition || {},
        item.conclusion || '',
        item.advice || '',
        item.risk_boundary || '',
        item.knowledge_entry_ids || [],
        item.graph_node_keys || [],
        item.trigger_explanation || '',
        actorUserId || null,
        changeSummary,
      ],
    );
  }

  return client.query(
    `
      insert into app.report_template_versions(template_id, version_no, module, name, report_kind, sections, tone, disclaimer, forbidden_expressions, risk_boundary, template_scope, published_by, change_summary)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      returning *
    `,
    [
      item.id,
      nextVersion,
      item.module,
      item.name,
      item.report_kind,
      item.sections || [],
      item.tone || '',
      item.disclaimer || '',
      item.forbidden_expressions || [],
      item.risk_boundary || '',
      item.template_scope || {},
      actorUserId || null,
      changeSummary,
    ],
  );
}

async function writeAudit(client, { actorUserId, action, targetType, targetId, metadata }) {
  await client.query(
    `
      insert into app.audit_logs(actor_user_id, action, target_type, target_id, metadata)
      values ($1, $2, $3, $4, $5)
    `,
    [actorUserId || null, action, targetType, targetId, metadata],
  );
}
