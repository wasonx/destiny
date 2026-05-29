import { buildReportContext } from '../reports/context-builder.mjs';
import { reviewReportSafety } from '../reports/safety-review.mjs';
import { memory, nextId } from './memory-state.mjs';

const disclaimer = '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。';

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

function buildPrompt(kind, payload) {
  return `请生成甄算${kind}报告。必须输出 JSON，避免绝对化和高风险承诺。用户输入：${JSON.stringify(payload)}`;
}

export function mountReportRoutes(app, { config, pool }) {
  app.get('/destiny-api/health', (_req, res) => {
    res.json({ ok: true, model: config.model, hasKey: Boolean(config.apiKey) });
  });

  app.post('/destiny-api/generate', async (req, res) => {
    const kind = req.body?.kind;
    const payload = req.body?.payload || {};
    if (!['life', 'relationship', 'question', 'space'].includes(kind)) {
      res.status(400).json({ error: 'Unsupported report kind' });
      return;
    }

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
              { role: 'user', content: buildPrompt(kind, payload) },
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

    const context = buildReportContext({ input: payload, features: {}, rules: [], knowledge: [], template: null });
    if (pool) {
      try {
        await pool.query(
          `
            insert into app.report_runs(report_kind, input_params, structured_context, final_report, source)
            values ($1, $2, $3, $4, $5)
          `,
          [kind, payload, context, report, report.source || 'fallback'],
        );
      } catch (error) {
        console.error(error);
      }
    } else {
      memory.reportRuns.push({ id: nextId('report'), report_kind: kind, input_params: payload, structured_context: context, final_report: report, source: report.source });
    }

    res.json({ report, safety });
  });
}
