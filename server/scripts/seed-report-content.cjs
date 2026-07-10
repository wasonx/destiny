// 播种报告内容：knowledge_entries / analysis_rules / report_templates
// 仅插入 status='published' 的内容，loadPublishedReportContent 才会读取。
// 内容定位：文化视角的自我探索参考，不含绝对化/恐吓式表述（符合 forbidden_expressions）。
const { Pool } = require('pg');
const fs = require('fs');

function loadDbUrl() {
  for (const f of ['.env', '/etc/zhensuan/knowledge.env']) {
    try {
      const txt = fs.readFileSync(f, 'utf8');
      const line = txt.split('\n').find((l) => l.startsWith('DATABASE_URL='));
      if (line) return line.slice('DATABASE_URL='.length).trim();
    } catch (e) {
      // ignore missing file
    }
  }
  return process.env.DATABASE_URL || '';
}

const DATABASE_URL = loadDbUrl();
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env / knowledge.env');
  process.exit(1);
}
const pool = new Pool({ connectionString: DATABASE_URL });

async function insertKnowledge(module, entries) {
  const ids = [];
  for (const e of entries) {
    const r = await pool.query(
      `insert into app.knowledge_entries (module, title, summary, body, tags, status, applicable_scope, concept_keys)
       values ($1, $2, $3, $4, $5, 'published', '{}'::jsonb, $6) returning id`,
      [module, e.title, e.summary, e.body, e.tags, e.conceptKeys],
    );
    ids.push(r.rows[0].id);
  }
  return ids;
}

async function insertRule(module, rule, knowledgeIds) {
  await pool.query(
    `insert into app.analysis_rules
      (module, name, priority, weight, condition, conclusion, advice, risk_boundary, knowledge_entry_ids, status, trigger_explanation)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, 'published', $10)`,
    [
      module,
      rule.name,
      rule.priority || 100,
      rule.weight || 0,
      JSON.stringify(rule.condition),
      rule.conclusion,
      rule.advice,
      rule.riskBoundary || '',
      knowledgeIds,
      rule.trigger || '',
    ],
  );
}

async function insertTemplate(module, reportKind, sections) {
  await pool.query(
    `insert into app.report_templates (module, name, report_kind, sections, tone, status, template_scope)
     values ($1, $2, $3, $4::jsonb, '亲民、克制、可解释', 'published', '{}'::jsonb)`,
    [module, `${reportKind} 模板`, reportKind, JSON.stringify(sections)],
  );
}

async function main() {
  // ===== life (module=bazi) =====
  const baziK = await insertKnowledge('bazi', [
    {
      title: '五行生克基础',
      summary: '木火土金水相生相克的基本关系',
      body: '五行中木生火、火生土、土生金、金生水、水生木；相克为木克土、土克水、水克火、火克金、金克木。命局讲究平衡，偏旺或偏弱都可通过生活方式做温和调节。',
      tags: ['五行', '基础'],
      conceptKeys: ['五行'],
    },
    {
      title: '日主与自我节奏',
      summary: '日干代表自我基调',
      body: '八字日干（日主）反映一个人稳定的行为基调与能量来源。了解日主强弱，有助于安排节奏：偏弱宜稳、偏旺宜疏。',
      tags: ['日主', '节奏'],
      conceptKeys: ['日主'],
    },
    {
      title: '大运流年提示',
      summary: '阶段性的外部影响',
      body: '大运与流年代表人生不同阶段的外部环境与主题，用来理解"为什么某段时间感觉顺或卡"，而非预测定数。',
      tags: ['大运', '流年'],
      conceptKeys: ['大运'],
    },
  ]);
  await insertRule('bazi', {
    name: 'life-五行平衡',
    priority: 90,
    weight: 5,
    condition: { field: 'kind', operator: 'eq', value: 'life' },
    conclusion: '结合出生信息看五行分布，优先关注偏旺或偏弱的元素。',
    advice: '偏弱元素对应的面向宜温和补充（如作息、环境、人际），避免激进改变。',
    riskBoundary: '五行仅为文化视角的参考模型，不代表能力或命运定数。',
    trigger: '用户生成照见报告时匹配',
  }, baziK);
  await insertRule('bazi', {
    name: 'life-关注方向',
    priority: 95,
    weight: 4,
    condition: { all: [{ field: 'kind', operator: 'eq', value: 'life' }, { field: 'concern', operator: 'neq', value: '' }] },
    conclusion: '用户关注方向（如事业/感情）可作为报告重点。',
    advice: '在对应面向给出可操作的小步建议，避免空泛。',
    riskBoundary: '',
    trigger: 'life 且指定 concern 时匹配',
  }, baziK);
  await insertTemplate('bazi', 'life', [
    { key: 'summary', title: '核心摘要', desc: '一句话概括整体节奏' },
    { key: 'character', title: '性格底色', desc: '稳定的行为基调' },
    { key: 'rhythm', title: '阶段提醒', desc: '未来一段时间的外部主题与应对' },
  ]);

  // ===== relationship =====
  const relK = await insertKnowledge('relationship', [
    {
      title: '双方日干关系',
      summary: '看两人日主生克',
      body: '双方日干（日主）的生克关系，可理解为互动中的"谁更主动、谁更被滋养"。这是关系动力的一面，不是好坏判定。',
      tags: ['合参', '日干'],
      conceptKeys: ['日干'],
    },
    {
      title: '五行互补',
      summary: '五行分布互补',
      body: '双方五行分布若能互补，往往在处理现实事务上更易分工；若高度重合，则同频但也可能放大同一盲点。',
      tags: ['互补', '五行'],
      conceptKeys: ['五行'],
    },
    {
      title: '沟通节奏差异',
      summary: '表达与节奏不同',
      body: '关系摩擦多来自节奏与表达方式差异，而非本质冲突。先确认共同目标，再谈具体期待。',
      tags: ['沟通', '节奏'],
      conceptKeys: ['沟通'],
    },
  ]);
  await insertRule('relationship', {
    name: 'rel-双方合参',
    priority: 90,
    weight: 6,
    condition: { field: 'kind', operator: 'eq', value: 'relationship' },
    conclusion: '当双方出生信息齐全时，结合日干关系与五行互补给出关系动力观察。',
    advice: '给出"先确认共同目标、减少猜测式沟通"的可执行建议。',
    riskBoundary: '合参仅描述互动动力，不构成对关系成败的判断。',
    trigger: '生成合缘报告时匹配',
  }, relK);
  await insertTemplate('relationship', 'relationship', [
    { key: 'summary', title: '核心摘要', desc: '关系动力一句话' },
    { key: 'dynamic', title: '双方特质与互动', desc: '日干关系与五行互补' },
    { key: 'advice', title: '沟通建议', desc: '可操作的小步行动' },
  ]);

  // ===== question =====
  const qK = await insertKnowledge('question', [
    {
      title: '一事一议原则',
      summary: '单次具体事件',
      body: '问时适合就一件具体、可验证的事展开，避免同时问多个抽象大问题。',
      tags: ['问事', '聚焦'],
      conceptKeys: ['问事'],
    },
    {
      title: '小步验证',
      summary: '低成本试探',
      body: '在信息未完全展开时，先做低成本、可逆的验证动作，再据反馈调整，比一次性投入更稳。',
      tags: ['验证', '行动'],
      conceptKeys: ['行动'],
    },
  ]);
  await insertRule('question', {
    name: 'q-聚焦验证',
    priority: 90,
    weight: 5,
    condition: { field: 'kind', operator: 'eq', value: 'question' },
    conclusion: '围绕用户问题方向给出"先观察、小步验证"的结构化分析。',
    advice: '建议把模糊担心拆成可验证的小问题，间隔复盘。',
    riskBoundary: '不建议短期内反复就同一事提问。',
    trigger: '生成问时报告时匹配',
  }, qK);
  await insertTemplate('question', 'question', [
    { key: 'summary', title: '核心摘要', desc: '当前局势一句话' },
    { key: 'action', title: '行动提醒', desc: '低成本验证动作' },
  ]);

  // ===== space =====
  const sK = await insertKnowledge('space', [
    {
      title: '入户动线',
      summary: '入口与通道',
      body: '入户后视线是否清爽、主通道是否通畅，直接影响空间使用效率与心理秩序。',
      tags: ['动线', '入口'],
      conceptKeys: ['动线'],
    },
    {
      title: '采光通风',
      summary: '光线与空气',
      body: '主要活动区（客厅、卧室、工位）的采光与通风，是低成本、高回报的调整优先项。',
      tags: ['采光', '通风'],
      conceptKeys: ['采光'],
    },
    {
      title: '朝向参考',
      summary: '方位与功能分区',
      body: '不同朝向适合不同功能：动区宜向南向东，静区宜安稳。朝向是参考，非硬性约束。',
      tags: ['朝向', '分区'],
      conceptKeys: ['朝向'],
    },
  ]);
  await insertRule('space', {
    name: 'space-动线优先',
    priority: 90,
    weight: 5,
    condition: { all: [{ field: 'kind', operator: 'eq', value: 'space' }, { field: 'focus', operator: 'eq', value: '整体格局' }] },
    conclusion: '整体格局优先看动线与入口秩序。',
    advice: '先清理主通道与入口堆物，再做装饰性调整。',
    riskBoundary: '',
    trigger: '安居且 focus=整体格局',
  }, sK);
  await insertRule('space', {
    name: 'space-朝向',
    priority: 92,
    weight: 4,
    condition: { all: [{ field: 'kind', operator: 'eq', value: 'space' }, { field: 'focus', operator: 'includes', value: '朝向' }] },
    conclusion: '结合用户提供的朝向给出功能分区参考。',
    advice: '动区朝南向东、静区求安稳，按实际采光调整。',
    riskBoundary: '',
    trigger: '安居且 focus 含"朝向"',
  }, sK);
  await insertTemplate('space', 'space', [
    { key: 'summary', title: '核心摘要', desc: '空间判断一句话' },
    { key: 'layout', title: '调整重点', desc: '动线/采光/朝向建议' },
    { key: 'action', title: '可先做的事', desc: '低成本可逆调整' },
  ]);

  console.log('SEED DONE');
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await pool.end();
  } catch (_) {}
  process.exit(1);
});
