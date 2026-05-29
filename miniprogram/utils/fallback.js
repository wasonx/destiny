const disclaimer = '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。';

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function text(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function buildFallbackReport(kind, payload = {}) {
  const focus = text(payload.concern || payload.category || payload.focus, '整体');
  const common = {
    kind,
    generatedAt: today(),
    disclaimer,
    source: 'fallback',
  };

  if (kind === 'relationship') {
    return {
      ...common,
      title: '合缘 · 双人关系',
      subtitle: `关系类型：${text(payload.relationType, '关系')}`,
      keywords: ['关系观察', '沟通节奏', '边界感'],
      summary: '这段关系适合从双方需求、表达节奏和现实协作三个层面理解。吸引点往往来自互补，摩擦点也可能来自节奏不同。',
      sections: [
        { title: '双方特质', content: '双方在关系中的表达方式不同，建议先确认共同目标，再讨论具体期待。', points: ['先确认共同目标', '减少猜测式沟通', '把需求说清楚'] },
        { title: '关系提醒', content: '短期内避免用情绪替代沟通，也不要用一次冲突判断整段关系。', points: ['避免冷处理', '避免逼迫表态', '设置沟通缓冲期'] },
      ],
      actions: ['把当前最在意的问题写成一句话', '约定一次不超过 30 分钟的沟通', '观察未来两周是否有实际调整'],
    };
  }

  if (kind === 'question') {
    return {
      ...common,
      title: '问时 · 一事一解',
      subtitle: `问题方向：${focus}`,
      keywords: ['先观察', '小步验证', '不宜反复'],
      summary: '当前问题更适合先收集现实反馈，再决定是否推进。若事情没有新变化，不建议短期内反复提问。',
      sections: [
        { title: '当前局势', content: '这件事处在信息尚未完全展开的阶段，适合用低成本方式验证现实反馈。', points: ['信息未完全明朗', '可先做小范围试探', '避免一次性投入过多'] },
        { title: '行动提醒', content: '建议把模糊担心拆成可验证的小问题，再根据新反馈调整下一步。', points: ['避免催促', '记录反馈', '间隔复盘'] },
      ],
      actions: ['先做一个低成本验证动作', '记录 3 个现实反馈', '至少间隔 1-2 周或出现新变化后再问'],
    };
  }

  if (kind === 'space') {
    return {
      ...common,
      title: '安居 · 环境分析',
      subtitle: `空间类型：${text(payload.spaceType, '居家环境')}`,
      keywords: ['动线', '采光', '低成本调整'],
      summary: '当前空间分析应优先关注入户动线、采光通风、休息区稳定性和收纳秩序。建议先做可逆、低成本调整。',
      sections: [
        { title: '整体判断', content: '如果入户后视线杂乱或动线被阻断，容易影响空间使用效率。', points: ['入口保持清爽', '主要通道不堆物', '动静区域尽量分开'] },
        { title: '调整重点', content: '先处理影响日常体验的空间问题，再考虑装饰性调整。', points: ['先动线', '再采光', '后陈设'] },
      ],
      actions: ['拍摄入户门、客厅、卧室三张照片复核', '清理主通道和入口堆物', '列出 3 个最影响日常体验的问题'],
    };
  }

  return {
    ...common,
    title: '照见 · 人生全景',
    subtitle: `关注方向：${focus}`,
    keywords: ['行动力', '责任感', '稳步积累'],
    summary: '你的整体节奏更适合通过长期积累建立稳定优势。当前阶段不宜频繁切换方向，更适合围绕一个核心目标持续推进。',
    sections: [
      { title: '性格底色', content: '你倾向于在明确目标后持续投入，对责任和结果较敏感。', points: ['目标感较强', '重视承诺', '需要稳定节奏'] },
      { title: '事业节奏', content: '事业上适合深耕一条主线，先稳住核心能力和资源，再逐步扩展。', points: ['减少频繁试错', '重视长期合作', '建立可复用能力'] },
      { title: '年度提醒', content: '未来一年适合做结构化整理，先稳定，再扩张。', points: ['整理资源', '推进关键计划', '避免冲动决策'] },
    ],
    actions: ['写下一个年度主目标', '减少 2 个消耗型任务', '每月复盘一次事业、关系和财务状态'],
  };
}

module.exports = {
  buildFallbackReport,
};
