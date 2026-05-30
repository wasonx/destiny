const { generateInsight } = require('../../utils/api');
const { buildFallbackReport } = require('../../utils/fallback');

Page({
  data: {
    concern: '整体',
    gender: 'male',
    reportTier: 'free',
    loading: false,
    concerns: ['整体', '感情', '事业', '财富', '学业', '家庭', '身心'],
    genders: [
      { value: 'male', label: '男' },
      { value: 'female', label: '女' },
    ],
    reportTiers: [
      { value: 'free', label: '免费体验版' },
      { value: 'full', label: '完整版' },
    ],
  },

  setConcern(event) {
    this.setData({ concern: event.currentTarget.dataset.value });
  },

  setGender(event) {
    this.setData({ gender: event.currentTarget.dataset.value });
  },

  setReportTier(event) {
    this.setData({ reportTier: event.currentTarget.dataset.value });
  },

  submit(event) {
    const payload = {
      ...event.detail.value,
      concern: this.data.concern,
      gender: this.data.gender,
    };

    this.createReport('life', payload);
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
