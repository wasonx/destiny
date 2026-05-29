const { generateInsight } = require('../../utils/api');
const { buildFallbackReport } = require('../../utils/fallback');

Page({
  data: {
    relationType: '恋人',
    loading: false,
    relationTypes: ['恋人', '夫妻', '亲子', '朋友', '合伙', '同事'],
  },

  setRelationType(event) {
    this.setData({ relationType: event.currentTarget.dataset.value });
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
