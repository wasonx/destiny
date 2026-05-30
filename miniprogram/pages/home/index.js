const auth = require('../../utils/auth');

Page({
  data: {
    hasToken: false,
    entries: [
      {
        id: 'life',
        title: '照见',
        subtitle: '个人节奏',
        description: '整理基础信息与关注方向，生成个人节奏参考报告。',
        view: '/pages/life/index',
      },
      {
        id: 'relationship',
        title: '合缘',
        subtitle: '关系理解',
        description: '记录双方信息和关系类型，梳理相处节奏与沟通重点。',
        view: '/pages/relationship/index',
      },
      {
        id: 'question',
        title: '问时',
        subtitle: '事项分析',
        description: '围绕一个具体问题，生成当下事项参考与行动提醒。',
        view: '/pages/question/index',
      },
      {
        id: 'space',
        title: '安居',
        subtitle: '空间建议',
        description: '结合空间类型和关注问题，生成居住或办公环境参考建议。',
        view: '/pages/space/index',
      },
      {
        id: 'compass',
        title: '罗盘',
        subtitle: '房屋朝向',
        description: '使用手机电子罗盘记录房屋朝向，为安居分析提供基础数据。',
        view: '/pages/compass/index',
      },
      {
        id: 'store',
        title: '商城',
        subtitle: '权益与实物',
        description: '购买报告次数包或实物产品，查看订单和退款进度。',
        view: '/pages/store/index',
      },
    ],
  },

  onLoad() {
    this.refreshLoginState();
    if (!auth.getToken()) {
      auth.loginWithWechatCode().then(() => {
        this.refreshLoginState();
      }).catch(() => {
        wx.showToast({
          title: '登录稍后重试',
          icon: 'none',
        });
      });
    }
  },

  onShow() {
    this.refreshLoginState();
  },

  refreshLoginState() {
    this.setData({ hasToken: Boolean(auth.getToken()) });
  },

  openLogin() {
    wx.navigateTo({
      url: '/pages/login/index',
    });
  },

  goTo(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.url,
    });
  },
});
