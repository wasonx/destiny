import { loadPublishedReportContent } from '../content/published-content-service.mjs';
import { spendReportQuota } from '../entitlements/ledger-service.mjs';
import { createGraphQueryService } from '../graph/graph-query-service.mjs';
import { buildReportProvenance, saveReportProvenance } from '../graph/report-provenance-service.mjs';
import { findSession, getBearerToken } from '../middleware/require-session.mjs';
import { buildReportContext } from '../reports/context-builder.mjs';
import { reviewReportSafety } from '../reports/safety-review.mjs';
import { summarizeBirthInput, summarizeFourPillars, summarizeRelationship } from '../rules/bazi-features.mjs';
import { runRules } from '../rules/rule-engine.mjs';
import { memory, nextId } from './memory-state.mjs';

const disclaimer = '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。';
const freeUpgradePrompt = '当前为免费体验版，已保留核心摘要和部分建议。解锁完整版可查看完整结构、规则解释、风险边界和更多行动建议。';

function today() {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(new Date());
}

export function buildFallbackReport(kind, payload = {}) {
  const focus = payload.concern || payload.category || payload.focus || '整体';
  const presets = {
    life: {
      title: '照见 · 人生全景',
      subtitle: `关注方向：${focus}`,
      keywords: ['行动力', '责任感', '稳步积累'],
      summary: '你的整体节奏更适合通过长期积累建立稳定优势。当前阶段适合围绕一个核心目标持续推进。',
      sections: [
        { title: '性格底色', content: '你倾向于在明确目标后持续投入，对责任和结果较敏感。需要留意不要把压力都转化为自我要求。', points: ['目标感较强', '重视承诺', '需要稳定节奏'] },
        { title: '事业节奏', content: '事业上适合深耕一条主线，先稳住核心能力和资源，再逐步扩展合作或副线机会。', points: ['减少频繁试错', '重视长期合作', '建立可复用能力'] },
        { title: '年度提醒', content: '未来一年适合做结构化整理，包括职业目标、财务习惯、关系边界和生活节奏。', points: ['先稳定', '再扩张', '避免冲动决策'] },
      ],
      actions: ['写下一个年度主目标', '减少 2 个消耗型任务', '每月复盘一次事业、关系和财务状态'],
    },
    relationship: {
      title: '合缘 · 双人关系',
      subtitle: `关系类型：${payload.relationType || '关系'}`,
      keywords: ['互补观察', '沟通节奏', '边界感'],
      summary: '这段关系适合从双方需求、表达节奏和现实协作三个层面理解。',
      sections: [
        { title: '双方特质', content: '双方在关系中的表达方式不同，适合先确认共同目标，再减少猜测式沟通。', points: ['确认目标', '减少猜测', '说清需求'] },
        { title: '吸引点', content: '彼此容易被对方身上的稳定感、行动力或新鲜视角吸引。', points: ['共同计划', '明确分工', '及时反馈'] },
        { title: '冲突提醒', content: '短期内需要避免用情绪替代沟通，也不要用一次冲突判断整段关系。', points: ['避免冷处理', '设置缓冲期', '观察调整意愿'] },
      ],
      actions: ['把当前最在意的问题写成一句话', '约定一次短沟通', '观察未来两周双方是否有实际调整'],
    },
    question: {
      title: '问时 · 一事一解',
      subtitle: `问题方向：${focus}`,
      keywords: ['先观察', '小步验证', '不宜反复'],
      summary: '当前问题更适合先收集现实反馈，再决定是否推进。',
      sections: [
        { title: '局势判断', content: '这件事处在信息尚未完全展开的阶段，适合用低成本方式验证。', points: ['信息未明朗', '小范围试探', '避免投入过多'] },
        { title: '有利因素', content: '已有基础条件可以支撑继续观察，接下来需要把担心变成可验证的问题。', points: ['目标清晰', '仍有空间', '适合复盘'] },
        { title: '不利因素', content: '最大风险来自情绪化推进、信息不足和过早下结论。', points: ['避免催促', '避免重复确认', '避免扩大问题'] },
      ],
      actions: ['先做低成本验证', '记录 3 个现实反馈', '间隔 1-2 周或出现新变化后再问'],
    },
    space: {
      title: '安居 · 环境分析',
      subtitle: `空间类型：${payload.spaceType || '居家环境'}`,
      keywords: ['动线', '采光', '低成本调整'],
      summary: '当前空间分析应优先关注入户动线、采光通风、休息区稳定性和收纳秩序。',
      sections: [
        { title: '户型整体', content: '如果入户后视线杂乱或动线被阻断，容易影响空间使用效率。', points: ['入口清爽', '通道不堆物', '动静分开'] },
        { title: '核心空间', content: '卧室以稳定休息为优先，书房以专注和光线为优先，客厅以通行顺畅为优先。', points: ['床位避强光', '书桌背后稳定', '客厅少阻隔'] },
        { title: '调整优先级', content: '先处理影响日常体验的问题，再考虑装饰性调整。', points: ['先动线', '再采光', '后陈设'] },
      ],
      actions: ['拍摄入户、客厅、卧室照片', '清理主通道', '列出 3 个最影响日常体验的问题'],
    },
  };
  const report = presets[kind] || presets.life;
  return { kind, ...report, generatedAt: today(), disclaimer, source: 'fallback' };
}

function normalizeReportTier(value) {
  return value === 'full' ? 'full' : 'free';
}

function applyReportTier(report, tier) {
  const full = tier === 'full';
  const next = {
    ...report,
    tier,
    reportTier: tier,
    isPreview: !full,
    upgradePrompt: full ? '' : freeUpgradePrompt,
  };
  if (!full) {
    next.keywords = Array.isArray(report.keywords) ? report.keywords.slice(0, 3) : [];
    next.sections = Array.isArray(report.sections) ? report.sections.slice(0, 2) : [];
    next.actions = Array.isArray(report.actions) ? report.actions.slice(0, 3) : [];
  }
  return next;
}

function buildPrompt(kind, payload) {
  return `请生成甄好算${kind}报告。必须输出 JSON，避免绝对化和高风险承诺。用户输入：${JSON.stringify(payload)}`;
}

function graphEmpty() {
  return { nodes: [], edges: [] };
}

function takeArray(value, limit = 50) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function compactReportContext(context = {}) {
  const graph = context.graph || graphEmpty();
  return {
    input: context.input || {},
    features: context.features || {},
    template: context.template
      ? {
          id: context.template.id,
          name: context.template.name,
          version_no: context.template.version_no,
          report_kind: context.template.report_kind,
          template_scope: context.template.template_scope || {},
          risk_boundary: context.template.risk_boundary || '',
        }
      : null,
    rules: takeArray(context.rules, 30).map((item) => ({
      id: item.id,
      name: item.name,
      version_no: item.version_no,
      priority: item.priority,
      weight: item.weight,
      knowledge_entry_ids: item.knowledge_entry_ids || [],
      graph_node_keys: item.graph_node_keys || [],
      risk_boundary: item.risk_boundary || '',
    })),
    knowledge: takeArray(context.knowledge, 30).map((item) => ({
      id: item.id,
      title: item.title,
      version_no: item.version_no,
      tags: item.tags || [],
      concept_keys: item.concept_keys || [],
      source_note: item.source_note || '',
    })),
    graph: {
      nodes: takeArray(graph.nodes, 80).map((item) => ({
        id: item.id,
        type: item.type,
        label: item.label,
        metadata: item.metadata || {},
      })),
      edges: takeArray(graph.edges, 120).map((item) => ({
        id: item.id,
        source: item.source,
        target: item.target,
        type: item.type,
        label: item.label,
        metadata: item.metadata || {},
      })),
    },
  };
}

function buildPromptWithContext(kind, payload, context = {}) {
  return `${buildPrompt(kind, payload)}\nLocal knowledge and graph context: ${JSON.stringify(compactReportContext(context))}`;
}

function collectConceptKeys(publishedContent = {}) {
  const keys = new Set();
  for (const item of publishedContent.knowledge || []) {
    for (const key of item.concept_keys || []) keys.add(key);
  }
  for (const item of publishedContent.rules || []) {
    for (const key of item.graph_node_keys || []) keys.add(key);
  }
  return [...keys].filter(Boolean).slice(0, 12);
}

function buildReportFacts(kind, payload = {}) {
  const baziInput = payload.fourPillars || payload.pillars || payload;
  let baziFacts = {};
  if (kind === 'life') {
    baziFacts = payload.birthdate ? summarizeBirthInput(payload) : summarizeFourPillars(baziInput);
  } else if (kind === 'relationship') {
    baziFacts = summarizeRelationship(
      { birthdate: payload.selfBirthdate, birthtime: payload.selfBirthtime },
      { birthdate: payload.otherBirthdate, birthtime: payload.otherBirthtime },
    );
  }
  const tags = [
    kind,
    payload.concern,
    payload.category,
    payload.focus,
    payload.relationType,
    payload.spaceType,
  ].filter(Boolean);

  return {
    ...baziFacts,
    kind,
    reportKind: kind,
    concern: payload.concern || '',
    category: payload.category || '',
    focus: payload.focus || '',
    relationType: payload.relationType || '',
    spaceType: payload.spaceType || '',
    gender: payload.gender || '',
    tags,
    input: payload,
  };
}

function selectKnowledgeForRules(knowledge = [], rules = []) {
  const ids = new Set();
  for (const rule of rules) {
    for (const id of rule.knowledge_entry_ids || []) {
      ids.add(id);
    }
  }
  return knowledge.filter((item) => ids.has(item.id));
}

function filterTemplateForRules(template, rules = []) {
  if (!template?.template_scope?.rule_ids) {
    return template || null;
  }
  const ruleIds = new Set(rules.map((rule) => rule.id));
  return {
    ...template,
    template_scope: {
      ...template.template_scope,
      rule_ids: template.template_scope.rule_ids.filter((id) => ruleIds.has(id)),
    },
  };
}

function buildTemplateSnapshotGraph(template, rules = []) {
  if (!template?.id) {
    return null;
  }
  const templateId = `template:${template.id}`;
  const nodes = [
    {
      id: templateId,
      type: 'Template',
      label: template.name || template.id,
      metadata: { versionNo: template.version_no, reportKind: template.report_kind },
    },
  ];
  const edges = [];
  for (const rule of rules) {
    const ruleId = `rule:${rule.id}`;
    nodes.push({
      id: ruleId,
      type: 'Rule',
      label: rule.name || rule.id,
      metadata: { versionNo: rule.version_no, priority: rule.priority, weight: rule.weight },
    });
    edges.push({
      id: `${templateId}->${ruleId}:TRIGGERS`,
      source: templateId,
      target: ruleId,
      type: 'TRIGGERS',
      label: '关联规则',
      metadata: {},
    });
  }
  if (template.risk_boundary) {
    const riskId = `risk:template:${template.id}`;
    nodes.push({ id: riskId, type: 'RiskBoundary', label: template.risk_boundary, metadata: {} });
    edges.push({
      id: `${templateId}->${riskId}:USES_RISK_BOUNDARY`,
      source: templateId,
      target: riskId,
      type: 'USES_RISK_BOUNDARY',
      label: '使用风险边界',
      metadata: {},
    });
  }
  return { focus: nodes[0], nodes, edges };
}

function mergeGraphs(graphs) {
  const nodes = new Map();
  const edges = new Map();
  let focus = null;
  for (const graph of graphs) {
    if (!graph) continue;
    if (!focus && graph.focus) focus = graph.focus;
    for (const item of graph.nodes || []) {
      if (item?.id) nodes.set(item.id, item);
    }
    for (const item of graph.edges || []) {
      if (item?.id) edges.set(item.id, item);
    }
  }
  return {
    focus,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

async function tryGraph(loadGraph) {
  try {
    return await loadGraph();
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function buildReportGraphContext({ pool, graphService, publishedContent = {} } = {}) {
  if (!pool || !graphService) {
    return graphEmpty();
  }

  const graphs = [];
  if (publishedContent.template?.id) {
    graphs.push(buildTemplateSnapshotGraph(publishedContent.template, publishedContent.rules || []));
  }
  for (const item of takeArray(publishedContent.rules, 12)) {
    graphs.push(await tryGraph(() => graphService.getRuleGraph(item.id, { pool })));
  }
  if (!(publishedContent.rules || []).length) {
    for (const item of takeArray(publishedContent.knowledge, 12)) {
      graphs.push(await tryGraph(() => graphService.getKnowledgeGraph(item.id, { pool })));
    }
  }

  for (const key of collectConceptKeys(publishedContent)) {
    graphs.push(await tryGraph(() => graphService.getConceptGraph(key, { depth: 1 })));
  }

  return mergeGraphs(graphs);
}

export function mountReportRoutes(app, { config, pool, graphDriver = null }) {
  const graphService = createGraphQueryService({ graphDriver, database: config.neo4jDatabase });

  app.get('/destiny-api/health', (_req, res) => {
    res.json({ ok: true, model: config.model, hasKey: Boolean(config.apiKey) });
  });

  app.post('/destiny-api/generate', async (req, res) => {
    const kind = req.body?.kind;
    const payload = req.body?.payload || {};
    const tier = normalizeReportTier(req.body?.tier || payload.tier);
    if (!['life', 'relationship', 'question', 'space'].includes(kind)) {
      res.status(400).json({ error: 'Unsupported report kind' });
      return;
    }
    const token = getBearerToken(req);
    const session = pool && token ? await findSession(req, { pool, config, accountTypes: ['customer'] }) : null;
    if (pool && token && !session) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    if (pool && tier === 'full' && !session) {
      res.status(401).json({ error: 'CUSTOMER_LOGIN_REQUIRED' });
      return;
    }

    const publishedContent = await loadPublishedReportContent(pool, {
      reportKind: kind,
      module: kind === 'life' ? 'bazi' : kind,
    });
    const facts = buildReportFacts(kind, payload);
    const ruleHits = runRules(publishedContent.rules, facts);
    const reportContent = {
      rules: ruleHits,
      knowledge: selectKnowledgeForRules(publishedContent.knowledge, ruleHits),
      template: filterTemplateForRules(publishedContent.template, ruleHits),
    };
    const reportGraph = await buildReportGraphContext({ pool, graphService, publishedContent: reportContent });
    const context = buildReportContext({
      input: payload,
      features: { ...facts, reportTier: tier, isPreview: tier === 'free' },
      rules: reportContent.rules,
      knowledge: reportContent.knowledge,
      template: reportContent.template,
      graph: reportGraph,
    });

    let report = null;
    if (config.apiKey) {
      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: '你只输出可解析 JSON，避免绝对化、高风险和恐吓式建议。' },
              { role: 'user', content: buildPromptWithContext(kind, payload, context) },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
        });
        const data = await response.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        const fallback = buildFallbackReport(kind, payload);
        report = {
          ...fallback,
          ...parsed,
          kind,
          ...(kind === 'life' && facts?.elements ? { elements: facts.elements } : {}),
          title: parsed.title || fallback.title,
          subtitle: parsed.subtitle || fallback.subtitle,
          keywords: Array.isArray(parsed.keywords) && parsed.keywords.length ? parsed.keywords : fallback.keywords,
          summary: parsed.summary || fallback.summary,
          sections: Array.isArray(parsed.sections) && parsed.sections.length ? parsed.sections : fallback.sections,
          actions: Array.isArray(parsed.actions) && parsed.actions.length ? parsed.actions : fallback.actions,
          generatedAt: today(),
          disclaimer: parsed.disclaimer || disclaimer,
          source: 'ai',
        };
      } catch (error) {
        console.error(error);
      }
    }

    report ||= buildFallbackReport(kind, payload);
    const safety = reviewReportSafety(JSON.stringify(report));
    if (!safety.passed) {
      report = buildFallbackReport(kind, payload);
    }
    report = applyReportTier(report, tier);

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const run = await client.query(
          `
            insert into app.report_runs(customer_id, report_kind, input_params, structured_context, final_report, source, report_tier, provenance)
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            returning id
          `,
          [session?.user_id || null, kind, payload, context, report, report.source || 'fallback', tier, {}],
        );
        const reportRunId = run.rows[0]?.id || null;
        if (tier === 'full' && session) {
          await spendReportQuota(client, {
            customerId: session.user_id,
            amount: 1,
            reason: 'full_report_generation',
            referenceType: 'report',
            referenceId: reportRunId,
          });
        }
        await client.query(
          `
            insert into app.safety_reviews(report_run_id, passed, flags, review_text)
            values ($1, $2, $3, $4)
          `,
          [reportRunId, safety.passed, safety.flags || [], JSON.stringify(safety)],
        );
        const provenance = buildReportProvenance({
          graph: context.graph || graphEmpty(),
          context,
          safety,
        });
        await saveReportProvenance(client, { reportRunId, provenance });
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        if (error.code === 'INSUFFICIENT_REPORT_QUOTA') {
          res.status(402).json({ error: 'INSUFFICIENT_REPORT_QUOTA' });
          return;
        }
        console.error(error);
      } finally {
        client.release();
      }
    } else {
      memory.reportRuns.push({ id: nextId('report'), report_kind: kind, report_tier: tier, input_params: payload, structured_context: context, final_report: report, source: report.source });
    }

    res.json({ report, safety, tier, entitlement: { spent: tier === 'full' && Boolean(session) ? 1 : 0 } });
  });
}
