const { generateInsight } = require('../../utils/api');
const { buildFallbackReport } = require('../../utils/fallback');

Page({
  data: {
    relationType: '恋人',
    reportTier: 'free',
    loading: false,
    relationTypes: ['恋人', '夫妻', '亲子', '朋友', '合伙', '同事'],
    reportTiers: [
      { value: 'free', label: '免费体验版' },
      { value: 'full', label: '完整版' },
    ],
  },

  setRelationType(event) {
    this.setData({ relationType: event.currentTarget.dataset.value });
  },

  setReportTier(event) {
    this.setData({ reportTier: event.currentTarget.dataset.value });
  },

  submit(event) {
    const payload = {
      ...event.detail.value,
      relationType: this.data.relationType,
    };

    this.createReport('relationship', payload);
  },

  createReport(kind, payload) {
    this.setData({ loading: true });
    generateInsight(kind, payload, this.data.reportTier)
      .catch(() => buildFallbackReport(kind, payload, this.data.reportTier))
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
