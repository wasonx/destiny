const auth = require('../../utils/auth');

Page({
  data: {
    hasToken: false,
    primaryEntries: [
      {
        id: 'life',
        tone: 'teal',
        mark: '命',
        title: '照见',
        subtitle: '个人节奏',
        description: '整理基础信息与关注方向，生成个人节奏参考报告。',
        view: '/pages/life/index',
      },
      {
        id: 'relationship',
        tone: 'red',
        mark: '缘',
        title: '合缘',
        subtitle: '关系理解',
        description: '记录双方信息和关系类型，梳理相处节奏与沟通重点。',
        view: '/pages/relationship/index',
      },
      {
        id: 'question',
        tone: 'gold',
        mark: '问',
        title: '问时',
        subtitle: '事项分析',
        description: '围绕一个具体问题，生成当下事项参考与行动提醒。',
        view: '/pages/question/index',
      },
      {
        id: 'space',
        tone: 'teal',
        mark: '宅',
        title: '安居',
        subtitle: '空间建议',
        description: '结合空间类型和关注问题，生成居住或办公环境参考建议。',
        view: '/pages/space/index',
      },
    ],
    utilityEntries: [
      {
        id: 'compass',
        mark: '向',
        title: '罗盘',
        subtitle: '房屋朝向',
        description: '记录朝向',
        view: '/pages/compass/index',
      },
      {
        id: 'store',
        mark: '购',
        title: '商城',
        subtitle: '权益与实物',
        description: '购买权益',
        view: '/pages/store/index',
      },
      {
        id: 'legal',
        mark: '规',
        title: '合规',
        subtitle: '协议与隐私',
        description: '协议边界',
        view: '/pages/legal/index',
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
