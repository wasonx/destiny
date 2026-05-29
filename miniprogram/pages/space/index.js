const { generateInsight } = require('../../utils/api');
const { buildFallbackReport } = require('../../utils/fallback');

Page({
  data: {
    spaceType: '居家环境',
    focus: '整体格局',
    photoCount: 0,
    loading: false,
    spaceTypes: ['居家环境', '办公环境'],
    focusOptions: ['整体格局', '睡眠休息', '亲子学习', '财富动线', '办公效率', '装修前评估'],
  },

  setSpaceType(event) {
    this.setData({ spaceType: event.currentTarget.dataset.value });
  },

  setFocus(event) {
    this.setData({ focus: event.currentTarget.dataset.value });
  },

  choosePhotos() {
    wx.chooseMedia({
      count: 6,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ photoCount: res.tempFiles.length });
      },
      fail: () => {},
    });
  },

  openCompass() {
    wx.navigateTo({
      url: '/pages/compass/index',
    });
  },

  submit(event) {
    const payload = {
      ...event.detail.value,
      spaceType: this.data.spaceType,
      focus: this.data.focus,
      photoCount: this.data.photoCount,
    };

    this.createReport('space', payload);
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
