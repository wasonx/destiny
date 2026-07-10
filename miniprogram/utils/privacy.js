// 微信隐私授权封装。
//
// 微信审核硬性要求：在调用 wx.login / 收集手机号等隐私接口前，必须先取得用户同意。
// 调用 wx.requirePrivacyAuthorize 会弹出微信官方隐私授权弹窗，
// 弹窗中的协议链接指向你在 MP 后台（mp.weixin.qq.com → 设置 → 用户隐私保护指引）配置的隐私协议。
//
// 注意：needAuthorization 为 true 的前提是已在 MP 后台配置隐私协议。
// 未配置时该接口会直接 resolve，不会阻断流程；配置完成后即自动强制授权。

let cachedNeedAuthorization = null;

// 查询当前是否需要授权（带缓存，避免重复 IO）。
function getPrivacySetting() {
  return new Promise((resolve) => {
    if (typeof wx.getPrivacySetting !== 'function') {
      resolve({ needAuthorization: false });
      return;
    }
    wx.getPrivacySetting({
      success: (res) => resolve(res || { needAuthorization: false }),
      fail: () => resolve({ needAuthorization: false }),
    });
  });
}

// 在隐私接口调用前 await 此函数。
// 用户同意 → resolve()；用户拒绝 → reject(Error('PRIVACY_DENIED'))。
function ensurePrivacyAuthorized() {
  return new Promise((resolve, reject) => {
    if (typeof wx.requirePrivacyAuthorize !== 'function') {
      // 基础库过低，无隐私接口，直接放行。
      resolve();
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (res && res.needAuthorization) {
          cachedNeedAuthorization = true;
          wx.requirePrivacyAuthorize({
            success: () => {
              cachedNeedAuthorization = false;
              resolve();
            },
            fail: () => reject(new Error('PRIVACY_DENIED')),
            complete: () => {},
          });
        } else {
          resolve();
        }
      },
      fail: () => resolve(),
    });
  });
}

module.exports = {
  getPrivacySetting,
  ensurePrivacyAuthorized,
};
