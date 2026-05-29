function directionName(degree) {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(((degree % 360) / 45)) % 8;
  return dirs[index];
}

Page({
  data: {
    degree: 0,
    direction: '北',
    recorded: '',
    calibrating: false,
    manualOffset: 0,
  },

  onLoad() {
    this.startCompass();
  },

  onUnload() {
    wx.stopCompass();
  },

  startCompass() {
    wx.startCompass({
      success: () => {
        wx.onCompassChange((res) => {
          const raw = Number(res.direction || 0);
          const degree = (raw + this.data.manualOffset + 360) % 360;
          this.setData({
            degree: Math.round(degree),
            direction: directionName(degree),
          });
        });
      },
      fail: () => {
        wx.showToast({
          title: '无法读取罗盘',
          icon: 'none',
        });
      },
    });
  },

  recordDirection() {
    const recorded = `${this.data.direction} ${this.data.degree}°`;
    this.setData({ recorded });
    wx.setStorageSync('house_direction', recorded);
    wx.showToast({
      title: '已记录房屋朝向',
      icon: 'success',
    });
  },

  calibrate() {
    this.setData({
      manualOffset: 0,
      calibrating: true,
    });
    wx.showToast({
      title: '请水平缓慢转动手机',
      icon: 'none',
    });
    setTimeout(() => {
      this.setData({ calibrating: false });
    }, 1800);
  },
});
