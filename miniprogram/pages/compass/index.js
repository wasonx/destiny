function directionName(degree) {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(((degree % 360) / 45)) % 8;
  return dirs[index];
}

const directionInterpretations = {
  北: '宜静养收藏，关注稳定与内在积累，注意背部与休息区方位。',
  东北: '宜稳固根基，利于学习、沉淀与长期规划。',
  东: '宜生机活力，适合起身向东活动，利健康与开端。',
  东南: '宜通风明亮，利于财气流动与人际舒展。',
  南: '宜明亮社交，注意心脏与名誉，适合会客与交流。',
  西南: '宜安稳人际，利于家庭和睦与平稳协作。',
  西: '宜收敛沉淀，适合安静休息与复盘。',
  西北: '宜权威决策，利于长辈、贵人与方向感。',
};

function interpretDirection(direction) {
  return directionInterpretations[direction] || '';
}

Page({
  data: {
    degree: 0,
    direction: '北',
    interpretation: directionInterpretations['北'],
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
          const direction = directionName(degree);
          this.setData({
            degree: Math.round(degree),
            direction,
            interpretation: interpretDirection(direction),
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
