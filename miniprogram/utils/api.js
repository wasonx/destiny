const API_BASE = 'https://www.goye.cc/destiny-api';

function handleUnauthorized(options = {}) {
  if (options.skipUnauthorizedRedirect) {
    return;
  }
  try {
    wx.removeStorageSync('customer_token');
  } catch (error) {
    // Ignore storage cleanup failures; the next login will overwrite the token.
  }
  try {
    wx.showToast({
      title: '登录已失效，请重新登录',
      icon: 'none',
    });
  } catch (error) {
    // Toast can fail in tests or unusual runtimes.
  }
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    const currentRoute = pages.length ? pages[pages.length - 1].route : '';
    if (currentRoute !== 'pages/login/index') {
      wx.navigateTo({
        url: '/pages/login/index',
      });
    }
  } catch (error) {
    // Navigation is best-effort; callers still receive the failed request.
  }
}

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

        if (res.statusCode === 401) {
          handleUnauthorized(options);
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

function fetchValueState() {
  return request('/customer/value-state');
}

function listProducts() {
  return request('/customer/products');
}

function listAddresses() {
  return request('/customer/addresses');
}

function createAddress(address) {
  return request('/customer/addresses', {
    method: 'POST',
    data: address,
  });
}

function updateAddress(id, address) {
  return request(`/customer/addresses/${id}`, {
    method: 'PATCH',
    data: address,
  });
}

function createOrder({ items, address, provider = 'manual' }) {
  return request('/customer/orders', {
    method: 'POST',
    data: {
      provider,
      items,
      address,
    },
  });
}

function listOrders() {
  return request('/customer/orders');
}

function getOrder(id) {
  return request(`/customer/orders/${id}`);
}

function createRefundRequest(orderId, payload) {
  return request(`/customer/orders/${orderId}/refund-requests`, {
    method: 'POST',
    data: payload,
  });
}

function listReportRuns() {
  return request('/customer/report-runs');
}

function getReportRun(id) {
  return request(`/customer/report-runs/${id}`);
}

function getLegalDocuments() {
  return request('/legal');
}

function applyReportTier(report, tier) {
  const isPreview = report.isPreview !== undefined ? report.isPreview : tier === 'free';
  const next = {
    ...report,
    tier: report.tier || tier,
    reportTier: report.reportTier || report.tier || tier,
    isPreview,
    upgradePrompt: report.upgradePrompt || (isPreview ? '当前为免费体验版，解锁完整版可查看完整结构、规则解释、风险边界和更多行动建议。' : ''),
  };
  if (isPreview) {
    next.keywords = (next.keywords || []).slice(0, 3);
    next.sections = (next.sections || []).slice(0, 2);
    next.actions = (next.actions || []).slice(0, 3);
  }
  return next;
}

function generateInsight(kind, payload, tier = 'free') {
  return request('/generate', {
    method: 'POST',
    data: {
      kind,
      payload,
      tier,
    },
  }).then((data) => {
    if (!data || !data.report || !data.report.title) {
      throw new Error('Invalid report response');
    }

    return applyReportTier({
      ...data.report,
      kind,
    }, tier);
  });
}

module.exports = {
  API_BASE,
  request,
  handleUnauthorized,
  checkHealth,
  fetchValueState,
  listProducts,
  listAddresses,
  createAddress,
  updateAddress,
  createOrder,
  listOrders,
  getOrder,
  createRefundRequest,
  listReportRuns,
  getReportRun,
  getLegalDocuments,
  generateInsight,
};
