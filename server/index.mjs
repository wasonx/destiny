import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 3201);
const apiKey = process.env.DEEPSEEK_API_KEY;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const endpoint = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

const disclaimer = '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。';

app.use(express.json({ limit: '1mb' }));

function today() {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(new Date());
}

function fallbackReport(kind, payload = {}) {
  const focus = payload.concern || payload.category || payload.focus || '整体';
  if (kind === 'life') {
    return {
      kind,
      title: '照见 · 人生全景',
      subtitle: `关注方向：${focus}`,
      generatedAt: today(),
      keywords: ['行动力', '责任感', '稳步积累'],
      summary: '你的整体节奏更适合通过长期积累建立稳定优势。当前阶段不宜频繁切换方向，更适合围绕一个核心目标持续推进。',
      sections: [
        { title: '性格底色', content: '你倾向于在明确目标后持续投入，对责任和结果较敏感。需要留意不要把所有压力都转化为自我要求。', points: ['目标感较强', '重视承诺', '需要稳定节奏'] },
        { title: '事业节奏', content: '事业上适合深耕一条主线，先稳住核心能力和资源，再逐步扩展合作或副线机会。', points: ['减少频繁试错', '重视长期合作', '建立可复用能力'] },
        { title: '关系与家庭', content: '关系中需要更直接表达需求，避免用沉默或过度承担代替沟通。家庭议题适合用边界和分工来处理。', points: ['表达需求', '设置边界', '减少替他人承担'] },
        { title: '年度提醒', content: '未来一年适合做结构化整理，包括职业目标、财务习惯、关系边界和生活节奏。先稳定，再扩张。', points: ['上半年整理资源', '下半年推进关键计划', '避免冲动决策'] },
      ],
      actions: ['写下一个年度主目标', '减少 2 个消耗型任务', '每月复盘一次事业、关系和财务状态'],
      disclaimer,
      source: 'fallback',
    };
  }

  if (kind === 'relationship') {
    return {
      kind,
      title: '合缘 · 双人关系',
      subtitle: `关系类型：${payload.relationType || '关系'}`,
      generatedAt: today(),
      keywords: ['互补观察', '沟通节奏', '边界感'],
      summary: '这段关系适合从双方需求、表达节奏和现实协作三个层面理解。吸引点往往来自互补，摩擦点也可能来自节奏不同。',
      sections: [
        { title: '双方特质', content: '双方在关系中的表达方式不同，一方更重视推进和回应，另一方可能更需要安全感和观察时间。', points: ['先确认共同目标', '减少猜测式沟通', '把需求说清楚'] },
        { title: '关系吸引点', content: '彼此容易被对方身上的稳定感、行动力或新鲜视角吸引，适合通过共同完成一件小事来建立更真实的信任。', points: ['共同计划', '明确分工', '及时反馈'] },
        { title: '冲突提醒', content: '短期内需要避免用情绪替代沟通，也不要用一次冲突判断整段关系。更重要的是观察双方是否愿意调整互动方式。', points: ['避免冷处理', '避免逼迫表态', '设置沟通缓冲期'] },
      ],
      actions: ['把当前最在意的问题写成一句话', '约定一次不超过 30 分钟的沟通', '观察未来两周双方是否有实际调整'],
      disclaimer,
      source: 'fallback',
    };
  }

  if (kind === 'question') {
    return {
      kind,
      title: '问时 · 一事一解',
      subtitle: `问题方向：${focus}`,
      generatedAt: today(),
      keywords: ['先观察', '小步验证', '不宜反复'],
      summary: '当前问题更适合先收集现实反馈，再决定是否推进。此时不建议凭焦虑做快速决定，也不建议短期内对同一件事反复提问。',
      sections: [
        { title: '当前局势判断', content: '这件事处在信息尚未完全展开的阶段，适合用低成本方式验证对方态度、资源条件或外部变化。', points: ['信息未完全明朗', '可先做小范围试探', '避免一次性投入过多'] },
        { title: '有利因素', content: '已有基础条件可以支撑继续观察，尤其是你已经意识到问题的关键矛盾，接下来需要把模糊担心变成可验证的问题。', points: ['目标感清晰', '仍有调整空间', '适合短周期复盘'] },
        { title: '不利因素', content: '最大风险来自情绪化推进、信息不足和对结果过早下结论。建议先等待一个明确的新信号。', points: ['避免催促', '避免重复确认', '避免扩大问题范围'] },
      ],
      actions: ['先做一个低成本验证动作', '记录 3 个现实反馈', '至少间隔 1-2 周或出现新变化后再问'],
      disclaimer,
      source: 'fallback',
    };
  }

  return {
    kind,
    title: '安居 · 环境分析',
    subtitle: `空间类型：${payload.spaceType || '居家环境'}`,
    generatedAt: today(),
    keywords: ['动线', '采光', '低成本调整'],
    summary: '当前空间分析应优先关注入户动线、采光通风、休息区稳定性和收纳秩序。建议先做可逆、低成本调整。',
    sections: [
      { title: '户型整体判断', content: '如果入户后视线杂乱或动线被阻断，容易影响空间使用效率。建议先清理入口区域，并建立明确的收纳边界。', points: ['入口保持清爽', '主要通道不堆物', '动静区域尽量分开'] },
      { title: '核心空间提醒', content: '卧室以稳定休息为优先，书房以专注和光线为优先，客厅以家庭互动和通行顺畅为优先。', points: ['床位避免强光直冲', '书桌保证背后稳定', '客厅减少尖锐阻隔'] },
      { title: '调整优先级', content: '先处理影响日常体验的空间问题，再考虑装饰性调整。不要为了形式感牺牲真实居住便利。', points: ['先动线', '再采光', '后陈设'] },
    ],
    actions: ['拍摄入户门、客厅、卧室三张照片复核', '清理主通道和入口堆物', '列出 3 个最影响日常体验的空间问题'],
    disclaimer,
    source: 'fallback',
  };
}

function buildPrompt(kind, payload) {
  const kindLabel = {
    life: '个人人生全景报告',
    relationship: '双人关系理解报告',
    question: '一事一解即时分析',
    space: '居家或办公环境分析报告',
  }[kind] || '人生与空间咨询报告';

  return `
你是一个谨慎、克制、专业的东方文化与生活建议报告撰写助手。请基于用户输入生成「${kindLabel}」。

必须遵守：
1. 不做医疗诊断、投资建议、法律建议或绝对化人生承诺。
2. 不使用“保证发财”“必定复合”“改命转运”“一定出事”等表达。
3. 问时类问题要提醒同一件事不宜频繁问，建议间隔 1-2 周或有新变化后再问。
4. 输出必须是严格 JSON，不要 Markdown，不要解释 JSON 之外的内容。
5. 每个 section 要有 title、content、points；points 3 条以内。

JSON 结构：
{
  "title": "string",
  "subtitle": "string",
  "keywords": ["string", "string", "string"],
  "summary": "string",
  "sections": [
    {"title": "string", "content": "string", "points": ["string"]}
  ],
  "actions": ["string", "string", "string"],
  "disclaimer": "${disclaimer}"
}

用户输入：
${JSON.stringify(payload, null, 2)}
`;
}

app.get('/destiny-api/health', (_req, res) => {
  res.json({ ok: true, model, hasKey: Boolean(apiKey) });
});

app.post('/destiny-api/generate', async (req, res) => {
  const kind = req.body?.kind;
  const payload = req.body?.payload || {};

  if (!['life', 'relationship', 'question', 'space'].includes(kind)) {
    res.status(400).json({ error: 'Unsupported report kind' });
    return;
  }

  if (!apiKey) {
    res.json({ report: fallbackReport(kind, payload) });
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你只输出可解析 JSON。你会避免绝对化、恐吓式和高风险建议。',
          },
          {
            role: 'user',
            content: buildPrompt(kind, payload),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    res.json({
      report: {
        ...parsed,
        kind,
        generatedAt: today(),
        disclaimer: parsed.disclaimer || disclaimer,
        source: 'ai',
      },
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({
      error: 'AI generation failed',
      report: fallbackReport(kind, payload),
    });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`destiny api listening on http://127.0.0.1:${port}`);
});
