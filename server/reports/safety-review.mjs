const absoluteWords = ['一定', '必定', '保证', '改命', '转运', '必然'];

export function reviewReportSafety(text) {
  const flags = absoluteWords.some((word) => String(text || '').includes(word)) ? ['absolute_claim'] : [];
  return {
    passed: flags.length === 0,
    flags,
    reviewText: flags.length ? '命中绝对化或高风险表达，需要改写。' : '通过基础安全审查。',
  };
}
