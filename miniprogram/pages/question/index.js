const { generateInsight } = require('../../utils/api');
const { buildFallbackReport } = require('../../utils/fallback');

Page({
  data: {
    category: '感情',
    loading: false,
    categories: ['感情', '事业', '财富', '学业', '家庭', '合作', '搬家'],
  },

  setCategory(event) {
    this.setData({ category: event.currentTarget.dataset.value });
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

    this.createReport('question', payload);
  },

  createReport(kind, payload) {
    this.setData({ loading: true });
    generateInsight(kind, payload)
      .catch(() => buildFallbackReport(kind, payload))
      .then((report) => {
        const app = getApp();
        app.globalData.currentReport = report;
        wx.setStorageSync('lastReport', report);
        wx.navigateTo({ url: '/pages/report/index' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },
});
