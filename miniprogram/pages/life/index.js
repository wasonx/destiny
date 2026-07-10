const { createReport } = require('../../utils/report-generator');

Page({
  data: {
    concern: '整体',
    gender: 'male',
    birthdate: '',
    birthtime: '',
    reportTier: 'free',
    loading: false,
    concerns: ['整体', '感情', '事业', '财富', '学业', '家庭', '身心'],
    genders: [
      { value: 'male', label: '男' },
      { value: 'female', label: '女' },
    ],
    reportTiers: [
      { value: 'free', label: '免费体验版' },
      { value: 'full', label: '完整版' },
    ],
  },

  setConcern(event) {
    this.setData({ concern: event.currentTarget.dataset.value });
  },

  setGender(event) {
    this.setData({ gender: event.currentTarget.dataset.value });
  },

  setReportTier(event) {
    this.setData({ reportTier: event.currentTarget.dataset.value });
  },

  onBirthDateChange(event) {
    this.setData({ birthdate: event.detail.value });
  },

  onBirthTimeChange(event) {
    this.setData({ birthtime: event.detail.value });
  },

  submit(event) {
    if (!this.data.birthdate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }
    const payload = {
      birthdate: this.data.birthdate,
      birthtime: this.data.birthtime,
      birthplace: event.detail.value.birthplace,
      concern: this.data.concern,
      gender: this.data.gender,
    };
    createReport(this, 'life', payload, this.data.reportTier);
  },
});
