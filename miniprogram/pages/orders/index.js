const api = require('../../utils/api');
const auth = require('../../utils/auth');

function money(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function statusText(status) {
  const labels = {
    pending_payment: '待支付确认',
    paid: '已支付',
    pending_fulfillment: '待发货',
    shipped: '已发货',
    completed: '已完成',
    refund_requested: '退款处理中',
    refunded: '已退款',
    closed: '已关闭',
  };
  return labels[status] || status;
}

function shipmentText(shipment) {
  if (!shipment) return '';
  return [shipment.carrier, shipment.tracking_no].filter(Boolean).join(' ');
}

Page({
  data: {
    orders: [],
    loading: false,
    refundingId: '',
    payingId: '',
  },

  onShow() {
    this.ensureLogin().then(() => this.loadOrders());
  },

  ensureLogin() {
    if (auth.getToken()) return Promise.resolve();
    return auth.loginWithWechatCode();
  },

  loadOrders() {
    this.setData({ loading: true });
    api.listOrders().then((data) => {
      const orders = (data.orders || []).map((order) => ({
        ...order,
        statusText: statusText(order.status),
        amountText: money(Number(order.amount_cents || 0) + Number(order.freight_cents || 0)),
        itemText: (order.items || []).map((item) => `${item.name || item.sku} x${item.quantity}`).join('，'),
        shipmentText: shipmentText(order.shipment),
      }));
      this.setData({ orders });
    }).catch(() => {
      wx.showToast({ title: '订单加载失败', icon: 'none' });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  payOrder(event) {
    const orderId = event.currentTarget.dataset.id;
    if (this.data.payingId) return;
    this.setData({ payingId: orderId });
    api.payOrder(orderId).then((data) => {
      if (!data || !data.paymentParams) {
        wx.showToast({ title: '支付参数获取失败', icon: 'none' });
        return;
      }
      console.log('[pay] paymentParams:', JSON.stringify(data.paymentParams));
      console.log('[pay] keys:', Object.keys(data.paymentParams).join(','));
      console.log('[pay] package:', data.paymentParams.package);
      console.log('[pay] signType:', data.paymentParams.signType);
      return new Promise((resolve, reject) => {
        wx.requestPayment({
          ...data.paymentParams,
          success: () => resolve(),
          fail: (error) => {
            console.error('[pay] requestPayment error:', JSON.stringify(error));
            const errMsg = error.errMsg || '';
            if (errMsg.indexOf('cancel') >= 0) {
              wx.showToast({ title: '已取消支付', icon: 'none' });
            } else {
              const detail = [
                '支付调用失败',
                '',
                '错误信息:',
                errMsg || '(无)',
                '',
                '请截图发给开发者排查',
              ].join('\n');
              wx.showModal({
                title: '支付失败',
                content: detail,
                showCancel: false,
                confirmText: '知道了',
              });
            }
            reject(error);
          },
        });
      });
    }).then(() => {
      wx.showToast({ title: '支付成功', icon: 'success' });
      this.loadOrders();
    }).catch(() => {}).finally(() => {
      this.setData({ payingId: '' });
    });
  },

  requestRefund(event) {
    const orderId = event.currentTarget.dataset.id;
    const order = this.data.orders.find((item) => item.id === orderId);
    if (!order || this.data.refundingId) return;

    this.setData({ refundingId: orderId });
    api.createRefundRequest(orderId, {
      reason: '客户在小程序申请退款',
      amount_cents: Number(order.amount_cents || 0) + Number(order.freight_cents || 0),
    }).then(() => {
      wx.showToast({ title: '已申请退款', icon: 'success' });
      this.loadOrders();
    }).catch(() => {
      wx.showToast({ title: '退款申请失败', icon: 'none' });
    }).finally(() => {
      this.setData({ refundingId: '' });
    });
  },
});
