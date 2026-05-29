const api = require('../../utils/api');
const auth = require('../../utils/auth');

function formatMoney(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

Page({
  data: {
    products: [],
    valueState: null,
    loading: false,
    creating: false,
  },

  onShow() {
    this.ensureLogin().then(() => {
      this.loadStore();
    });
  },

  ensureLogin() {
    if (auth.getToken()) return Promise.resolve();
    return auth.loginWithWechatCode().catch(() => {
      wx.showToast({ title: '登录稍后重试', icon: 'none' });
    });
  },

  loadStore() {
    this.setData({ loading: true });
    Promise.all([
      api.listProducts(),
      api.fetchValueState().catch(() => null),
    ]).then(([productData, valueState]) => {
      const products = (productData.products || []).map((product) => ({
        ...product,
        priceText: formatMoney(product.price_cents),
        typeText: product.requires_shipping || product.product_type === 'physical_goods' ? '实物商品' : '虚拟权益',
      }));
      this.setData({ products, valueState });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  buyProduct(event) {
    const sku = event.currentTarget.dataset.sku;
    const product = this.data.products.find((item) => item.sku === sku);
    if (!product || this.data.creating) return;

    this.setData({ creating: true });
    const create = (address) => api.createOrder({
      provider: 'manual',
      items: [{ sku: product.sku, quantity: 1 }],
      address,
    });

    const orderTask = product.requires_shipping || product.product_type === 'physical_goods'
      ? api.listAddresses().then((data) => {
        const address = (data.addresses || []).find((item) => item.is_default) || (data.addresses || [])[0];
        if (!address) {
          wx.showToast({ title: '请先填写收货地址', icon: 'none' });
          wx.navigateTo({ url: '/pages/address/index' });
          throw new Error('ADDRESS_REQUIRED');
        }
        return create(address);
      })
      : create(null);

    orderTask.then(() => {
      wx.showToast({ title: '订单已创建', icon: 'success' });
      wx.navigateTo({ url: '/pages/orders/index' });
    }).catch((error) => {
      if (error.message !== 'ADDRESS_REQUIRED') {
        wx.showToast({ title: '下单失败', icon: 'none' });
      }
    }).finally(() => {
      this.setData({ creating: false });
    });
  },

  openAddress() {
    wx.navigateTo({ url: '/pages/address/index' });
  },

  openOrders() {
    wx.navigateTo({ url: '/pages/orders/index' });
  },
});
