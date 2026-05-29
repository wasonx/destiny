const { buildFallbackReport } = require('../../utils/fallback');

Page({
  data: {
    report: null,
  },

  onLoad() {
    const app = getApp();
    const report = app.globalData.currentReport || wx.getStorageSync('lastReport') || buildFallbackReport('life');
    this.setData({ report });
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/home/index',
    });
  },
});
