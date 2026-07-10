const { createReport } = require('../../utils/report-generator');
const { uploadImage } = require('../../utils/api');

Page({
  data: {
    spaceType: '居家环境',
    focus: '整体格局',
    direction: '',
    photos: [],
    uploading: false,
    maxPhotos: 6,
    reportTier: 'free',
    loading: false,
    spaceTypes: ['居家环境', '办公环境'],
    focusOptions: ['整体格局', '睡眠休息', '亲子学习', '财富动线', '办公效率', '装修前评估'],
    reportTiers: [
      { value: 'free', label: '免费体验版' },
      { value: 'full', label: '完整版' },
    ],
  },

  onShow() {
    try {
      const saved = wx.getStorageSync('house_direction');
      if (saved) this.setData({ direction: saved });
    } catch (e) {
      // storage read failure is non-fatal
    }
  },

  setSpaceType(event) {
    this.setData({ spaceType: event.currentTarget.dataset.value });
  },

  setFocus(event) {
    this.setData({ focus: event.currentTarget.dataset.value });
  },

  setReportTier(event) {
    this.setData({ reportTier: event.currentTarget.dataset.value });
  },

  choosePhotos() {
    const remain = this.data.maxPhotos - this.data.photos.length;
    if (remain <= 0) {
      wx.showToast({ title: `最多 ${this.data.maxPhotos} 张`, icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles || [];
        this.setData({ uploading: true });
        const uploaded = [];
        Promise.all(
          tempFiles.map((file) =>
            uploadImage(file.tempFilePath)
              .then((result) => {
                if (result && result.url) uploaded.push(result.url);
              })
              .catch(() => null)
          )
        ).then(() => {
          if (uploaded.length) {
            this.setData({ photos: this.data.photos.concat(uploaded) });
          }
          if (uploaded.length < tempFiles.length) {
            wx.showToast({ title: '部分照片上传失败已跳过', icon: 'none' });
          }
          this.setData({ uploading: false });
        });
      },
      fail: () => {
        this.setData({ uploading: false });
      },
    });
  },

  removePhoto(event) {
    const index = event.currentTarget.dataset.index;
    const photos = this.data.photos.slice();
    photos.splice(index, 1);
    this.setData({ photos });
  },

  openCompass() {
    wx.navigateTo({
      url: '/pages/compass/index',
    });
  },

  submit(event) {
    if (this.data.uploading) {
      wx.showToast({ title: '照片上传中，请稍候', icon: 'none' });
      return;
    }
    const inputDirection = event.detail.value.direction || '';
    let direction = inputDirection;
    if (!direction) {
      try {
        direction = wx.getStorageSync('house_direction') || '';
      } catch (e) {
        direction = '';
      }
    }
    const payload = {
      ...event.detail.value,
      spaceType: this.data.spaceType,
      focus: this.data.focus,
      direction,
      photos: this.data.photos,
      photoCount: this.data.photos.length,
    };
    createReport(this, 'space', payload, this.data.reportTier);
  },
});
