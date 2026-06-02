const api = require('../../utils/api');
const auth = require('../../utils/auth');

function formatLevel(valueState) {
  return valueState?.points?.growth_level || '启蒙';
}

Page({
  data: {
    hasToken: false,
    loading: false,
    valueState: null,
    reportQuota: 0,
    pointsBalance: 0,
    growthLevel: '启蒙',
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const hasToken = Boolean(auth.getToken());
    this.setData({ hasToken });
    if (!hasToken) {
      this.setData({
        valueState: null,
        reportQuota: 0,
        pointsBalance: 0,
        growthLevel: '启蒙',
      });
      return;
    }
    this.loadValueState();
  },

  loadValueState() {
    this.setData({ loading: true });
    api.fetchValueState()
      .then((valueState) => {
        this.setData({
          valueState,
          reportQuota: valueState.reportQuotaBalance || 0,
          pointsBalance: valueState.points?.points_balance || 0,
          growthLevel: formatLevel(valueState),
        });
      })
      .catch(() => {
        this.setData({
          reportQuota: 0,
          pointsBalance: 0,
          growthLevel: '启蒙',
        });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  loginWithWechat() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    auth.loginWithWechatCode()
      .then(() => {
        wx.showToast({ title: '已登录', icon: 'success' });
        this.refresh();
      })
      .catch(() => {
        wx.showToast({ title: '登录稍后重试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  openLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  openReports() {
    wx.navigateTo({ url: '/pages/report/index' });
  },

  openOrders() {
    wx.navigateTo({ url: '/pages/orders/index' });
  },

  openAddress() {
    wx.navigateTo({ url: '/pages/address/index' });
  },

  openLegal() {
    wx.navigateTo({ url: '/pages/legal/index' });
  },

  openStore() {
    wx.switchTab({ url: '/pages/store/index' });
  },
});
