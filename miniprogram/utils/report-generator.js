const { generateInsight, applyReportTier } = require('./api');
const { buildFallbackReport } = require('./fallback');

// 统一的报告生成入口：loading 态 + 失败降级兜底 + 401 交给登录流程处理。
// 4 个功能页（life/relationship/question/space）统一调用，避免重复实现。
function createReport(page, kind, payload, tier = 'free') {
  page.setData({ loading: true });
  return generateInsight(kind, payload, tier)
    .catch((error) => {
      // 401 时登录流程已在 request 层接管跳转，这里不再兜底，直接跳过导航
      if (error && error.statusCode === 401) {
        return { __authSkip: true };
      }
      return applyReportTier(buildFallbackReport(kind, payload, tier), tier);
    })
    .then((report) => {
      if (!report || report.__authSkip) return;
      const app = getApp();
      if (app && app.globalData) app.globalData.currentReport = report;
      try {
        wx.setStorageSync('lastReport', report);
      } catch (e) {
        // storage failure is non-fatal; in-memory currentReport still works
      }
      wx.navigateTo({ url: '/pages/report/index' });
    })
    .finally(() => {
      page.setData({ loading: false });
    });
}

module.exports = {
  createReport,
};
