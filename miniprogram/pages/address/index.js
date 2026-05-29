const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    addresses: [],
    saving: false,
    form: {
      receiver_name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail_address: '',
      is_default: true,
    },
  },

  onShow() {
    this.ensureLogin().then(() => this.loadAddresses());
  },

  ensureLogin() {
    if (auth.getToken()) return Promise.resolve();
    return auth.loginWithWechatCode();
  },

  loadAddresses() {
    api.listAddresses().then((data) => {
      this.setData({ addresses: data.addresses || [] });
    }).catch(() => {
      wx.showToast({ title: '地址加载失败', icon: 'none' });
    });
  },

  updateField(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      form: {
        ...this.data.form,
        [field]: event.detail.value,
      },
    });
  },

  submit() {
    const form = this.data.form;
    if (!form.receiver_name || !form.phone || !form.detail_address) {
      wx.showToast({ title: '请填写完整地址', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    api.createAddress(form).then(() => {
      wx.showToast({ title: '地址已保存', icon: 'success' });
      this.setData({
        form: {
          receiver_name: '',
          phone: '',
          province: '',
          city: '',
          district: '',
          detail_address: '',
          is_default: true,
        },
      });
      this.loadAddresses();
    }).finally(() => {
      this.setData({ saving: false });
    });
  },
});
