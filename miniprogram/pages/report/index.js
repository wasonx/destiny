const api = require('../../utils/api');
const { buildFallbackReport } = require('../../utils/fallback');

const kindLabels = {
  life: '照见',
  relationship: '合缘',
  question: '问时',
  space: '安居',
};

function formatReportRun(run) {
  const report = run && run.final_report ? run.final_report : null;
  if (!report) return null;
  return {
    ...report,
    kind: run.report_kind || report.kind,
    tier: report.tier || run.report_tier || 'free',
    reportTier: report.reportTier || run.report_tier || 'free',
    source: report.source || run.source,
    reportRunId: run.id,
    createdAt: run.created_at,
  };
}

function formatHistoryRun(run) {
  const report = run.final_report || {};
  const title = report.title || kindLabels[run.report_kind] || '报告';
  return {
    ...run,
    title,
    tierText: run.report_tier === 'full' ? '完整版' : '免费版',
    kindText: kindLabels[run.report_kind] || run.report_kind || '报告',
    timeText: run.created_at ? String(run.created_at).slice(0, 16).replace('T', ' ') : '时间未记录',
  };
}

Page({
  data: {
    report: null,
    historyRuns: [],
    selectedRunId: '',
    loadingHistory: false,
  },

  onLoad() {
    const app = getApp();
    const report = app.globalData.currentReport || wx.getStorageSync('lastReport') || buildFallbackReport('life');
    this.setData({ report });
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    this.setData({ loadingHistory: true });
    api.listReportRuns()
      .then((data) => {
        const historyRuns = (data.reportRuns || []).map(formatHistoryRun);
        const firstReport = historyRuns[0] ? formatReportRun(historyRuns[0]) : null;
        this.setData({
          historyRuns,
          report: firstReport || this.data.report,
          selectedRunId: historyRuns[0]?.id || this.data.selectedRunId,
        });
      })
      .catch(() => {
        this.setData({ historyRuns: [] });
      })
      .finally(() => {
        this.setData({ loadingHistory: false });
      });
  },

  openReportRun(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ selectedRunId: id });
    api.getReportRun(id)
      .then((data) => {
        const run = data.reportRun || null;
        const report = formatReportRun(run);
        if (report) {
          this.setData({ report });
        }
      })
      .catch(() => {
        const run = this.data.historyRuns.find((item) => item.id === id);
        const report = formatReportRun(run);
        if (report) {
          this.setData({ report });
        }
      });
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/home/index',
    });
  },
});
