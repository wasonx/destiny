const auth = require('../../utils/auth');

function parseQrLoginToken(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.token) {
      return String(parsed.token).trim();
    }
  } catch (error) {
    // QR content can also be a plain token or URL.
  }

  const tokenIndex = text.indexOf('token=');
  if (tokenIndex >= 0) {
    return decodeURIComponent(text.slice(tokenIndex + 6).split(/[&#]/)[0]).trim();
  }

  return text;
}

Page({
  data: {
    phone: '',
    code: '',
    sending: false,
    loggingIn: false,
    scanningQr: false,
    message: '',
  },

  updatePhone(event) {
    this.setData({ phone: event.detail.value.trim() });
  },

  updateCode(event) {
    this.setData({ code: event.detail.value.trim() });
  },

  openLegal() {
    wx.navigateTo({ url: '/pages/legal/index' });
  },

  finishLogin(message) {
    this.setData({ message });
    wx.showToast({ title: message, icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({
        fail() {
          wx.redirectTo({ url: '/pages/home/index' });
        },
      });
    }, 500);
  },

  loginWithWechatCode() {
    if (this.data.loggingIn) return;
    this.setData({ loggingIn: true, message: '' });
    auth.loginWithWechatCode()
      .then(() => {
        this.finishLogin('微信登录成功');
      })
      .catch(() => {
        wx.showToast({ title: '微信登录失败，请稍后重试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loggingIn: false });
      });
  },

  scanQrLogin() {
    if (this.data.scanningQr) return;
    this.setData({ scanningQr: true, message: '' });

    const ensureCustomerSession = auth.getToken() ? Promise.resolve() : auth.loginWithWechatCode();
    ensureCustomerSession
      .then(() => new Promise((resolve, reject) => {
        wx.scanCode({
          onlyFromCamera: false,
          success: resolve,
          fail: reject,
        });
      }))
      .then((scanResult) => {
        const token = parseQrLoginToken(scanResult && scanResult.result);
        if (!token) {
          throw new Error('QR_TOKEN_MISSING');
        }
        return auth.confirmQrLogin(token);
      })
      .then(() => {
        this.finishLogin('扫码确认成功');
      })
      .catch(() => {
        wx.showToast({ title: '扫码登录失败，请重试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ scanningQr: false });
      });
  },

  sendPhoneOtp() {
    if (!/^1\d{10}$/.test(this.data.phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (this.data.sending) return;
    this.setData({ sending: true, message: '' });
    auth.sendPhoneOtp(this.data.phone)
      .then((data) => {
        const suffix = data && data.devCode ? `（测试码 ${data.devCode}）` : '';
        this.setData({ message: `验证码已发送${suffix}` });
        wx.showToast({ title: '验证码已发送', icon: 'success' });
      })
      .catch(() => {
        wx.showToast({ title: '验证码发送失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ sending: false });
      });
  },

  verifyPhoneOtp() {
    if (!this.data.phone || !this.data.code) {
      wx.showToast({ title: '请填写手机号和验证码', icon: 'none' });
      return;
    }
    if (this.data.loggingIn) return;
    this.setData({ loggingIn: true, message: '' });
    auth.verifyPhoneOtp(this.data.phone, this.data.code)
      .then(() => {
        this.finishLogin('手机登录成功');
      })
      .catch(() => {
        wx.showToast({ title: '验证码不正确', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loggingIn: false });
      });
  },
});
