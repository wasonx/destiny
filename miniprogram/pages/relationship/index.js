const { createReport } = require('../../utils/report-generator');

Page({
  data: {
    relationType: '恋人',
    selfBirthdate: '',
    selfBirthtime: '',
    otherBirthdate: '',
    otherBirthtime: '',
    reportTier: 'free',
    loading: false,
    relationTypes: ['恋人', '夫妻', '亲子', '朋友', '合伙', '同事'],
    reportTiers: [
      { value: 'free', label: '免费体验版' },
      { value: 'full', label: '完整版' },
    ],
  },

  setRelationType(event) {
    this.setData({ relationType: event.currentTarget.dataset.value });
  },

  setReportTier(event) {
    this.setData({ reportTier: event.currentTarget.dataset.value });
  },

  onSelfBirthDateChange(event) {
    this.setData({ selfBirthdate: event.detail.value });
  },

  onSelfBirthTimeChange(event) {
    this.setData({ selfBirthtime: event.detail.value });
  },

  onOtherBirthDateChange(event) {
    this.setData({ otherBirthdate: event.detail.value });
  },

  onOtherBirthTimeChange(event) {
    this.setData({ otherBirthtime: event.detail.value });
  },

  submit(event) {
    if (!this.data.selfBirthdate) {
      wx.showToast({ title: '请先填写您的出生日期', icon: 'none' });
      return;
    }
    const payload = {
      selfBirthdate: this.data.selfBirthdate,
      selfBirthtime: this.data.selfBirthtime,
      selfBirthplace: event.detail.value.selfBirthplace,
      otherBirthdate: this.data.otherBirthdate,
      otherBirthtime: this.data.otherBirthtime,
      otherBirthplace: event.detail.value.otherBirthplace,
      relationType: this.data.relationType,
      question: event.detail.value.question,
    };
    createReport(this, 'relationship', payload, this.data.reportTier);
  },
});
