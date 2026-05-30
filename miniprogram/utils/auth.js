const api = require('./api');

const TOKEN_KEY = 'customer_token';

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

function loginWithWechatCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('WECHAT_CODE_MISSING'));
          return;
        }
        api.request('/customer/login/wechat', {
          method: 'POST',
          data: {
            code: loginRes.code,
          },
        }).then((data) => {
          if (data && data.token) {
            setToken(data.token);
          }
          resolve(data);
        }).catch(reject);
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

function sendPhoneOtp(phone) {
  return api.request('/customer/otp/send', {
    method: 'POST',
    data: {
      phone,
    },
  });
}

function verifyPhoneOtp(phone, code) {
  return api.request('/customer/otp/verify', {
    method: 'POST',
    data: {
      phone,
      code,
    },
  }).then((data) => {
    if (data && data.token) {
      setToken(data.token);
    }
    return data;
  });
}

function confirmQrLogin(token) {
  return api.request('/customer/qr/confirm', {
    method: 'POST',
    data: {
      token,
    },
  });
}

module.exports = {
  TOKEN_KEY,
  getToken,
  setToken,
  loginWithWechatCode,
  sendPhoneOtp,
  verifyPhoneOtp,
  confirmQrLogin,
};
