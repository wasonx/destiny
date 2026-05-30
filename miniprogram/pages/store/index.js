const api = require('../../utils/api');
const auth = require('../../utils/auth');

function formatMoney(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function isPhysicalProduct(product) {
  return Boolean(product && (product.requires_shipping || product.product_type === 'physical_goods'));
}

function formatAddress(address) {
  if (!address) return '';
  return [
    address.receiver_name || address.receiverName,
    address.phone,
    address.province,
    address.city,
    address.district,
    address.detail_address || address.detailAddress,
  ].filter(Boolean).join(' ');
}

Page({
  data: {
    products: [],
    addresses: [],
    addressOptions: [],
    selectedAddressId: '',
    selectedAddress: null,
    selectedAddressLabel: '',
    selectedAddressDetail: '',
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
      api.listAddresses().catch(() => ({ addresses: [] })),
    ]).then(([productData, valueState, addressData]) => {
      const products = (productData.products || []).map((product) => ({
        ...product,
        priceText: formatMoney(product.price_cents),
        typeText: isPhysicalProduct(product) ? '实物商品' : '虚拟权益',
      }));
      const addresses = addressData.addresses || [];
      const selectedAddress = this.pickSelectedAddress(addresses);
      this.setData({
        products,
        valueState,
        addresses,
        addressOptions: addresses.map((address) => ({
          id: address.id,
          label: formatAddress(address),
        })),
        selectedAddressId: selectedAddress ? selectedAddress.id : '',
        selectedAddress,
        selectedAddressLabel: selectedAddress ? `${selectedAddress.receiver_name || selectedAddress.receiverName || ''} · ${selectedAddress.phone || ''}` : '',
        selectedAddressDetail: selectedAddress ? formatAddress(selectedAddress) : '',
      });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  pickSelectedAddress(addresses) {
    return addresses.find((item) => item.id === this.data.selectedAddressId)
      || addresses.find((item) => item.is_default)
      || addresses[0]
      || null;
  },

  selectAddress(event) {
    const index = Number(event.detail.value);
    const selectedAddress = this.data.addresses[index] || null;
    this.setData({
      selectedAddress,
      selectedAddressId: selectedAddress ? selectedAddress.id : '',
      selectedAddressLabel: selectedAddress ? `${selectedAddress.receiver_name || selectedAddress.receiverName || ''} · ${selectedAddress.phone || ''}` : '',
      selectedAddressDetail: selectedAddress ? formatAddress(selectedAddress) : '',
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

    const orderTask = isPhysicalProduct(product)
      ? Promise.resolve().then(() => {
        const address = this.data.selectedAddress;
        if (!address) {
          wx.showToast({ title: '请先填写收货地址', icon: 'none' });
          wx.navigateTo({ url: '/pages/address/index' });
          throw new Error('ADDRESS_REQUIRED');
        }
        return create({
          ...address,
          address_snapshot: formatAddress(address),
        });
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
