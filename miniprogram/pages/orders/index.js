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
