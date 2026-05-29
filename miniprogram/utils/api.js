const API_BASE = 'https://www.goye.cc/destiny-api';

function request(path, options = {}) {
  let token = '';
  try {
    token = wx.getStorageSync('customer_token') || '';
  } catch (error) {
    token = '';
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'content-type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...(options.header || {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        reject(new Error(`HTTP ${res.statusCode}`));
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

function checkHealth() {
  return request('/health');
}

function generateInsight(kind, payload) {
  return request('/generate', {
    method: 'POST',
    data: {
      kind,
      payload,
    },
  }).then((data) => {
    if (!data || !data.report || !data.report.title) {
      throw new Error('Invalid report response');
    }

    return {
      ...data.report,
      kind,
    };
  });
}

module.exports = {
  API_BASE,
  request,
  checkHealth,
  generateInsight,
};
