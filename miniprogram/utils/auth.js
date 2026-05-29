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
        api.request('/customer/login/wechat', {
          method: 'POST',
          data: {
            code: loginRes.code || 'mock-code',
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

module.exports = {
  TOKEN_KEY,
  getToken,
  setToken,
  loginWithWechatCode,
};
