const { createReport } = require('../../utils/report-generator');

Page({
  data: {
    category: '感情',
    reportTier: 'free',
    loading: false,
    categories: ['感情', '事业', '财富', '学业', '家庭', '合作', '搬家'],
    reportTiers: [
      { value: 'free', label: '免费体验版' },
      { value: 'full', label: '完整版' },
    ],
  },

  setCategory(event) {
    this.setData({ category: event.currentTarget.dataset.value });
  },

  setReportTier(event) {
    this.setData({ reportTier: event.currentTarget.dataset.value });
  },

  submit(event) {
    const question = event.detail.value.question;
    if (!question || !question.trim()) {
      wx.showToast({
        title: '请先填写问题',
        icon: 'none',
      });
      return;
    }

    const payload = {
      category: this.data.category,
      question: question.trim(),
      askedAt: new Date().toISOString(),
    };

    createReport(this, 'question', payload, this.data.reportTier);
  },
});
