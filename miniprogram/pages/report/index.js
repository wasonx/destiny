const api = require('../../utils/api');
const { buildFallbackReport } = require('../../utils/fallback');

const kindLabels = {
  life: '照见',
  relationship: '合缘',
  question: '问时',
  space: '安居',
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function textOf(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function titleOf(item, fallback) {
  if (!item || typeof item !== 'object') return fallback;
  return textOf(item.title) || textOf(item.name) || textOf(item.label) || textOf(item.conclusion) || textOf(item.id) || fallback;
}

function edgeText(edge) {
  if (!edge || typeof edge !== 'object') return '暂无路径';
  const from = textOf(edge.source) || textOf(edge.from) || '节点';
  const to = textOf(edge.target) || textOf(edge.to) || '节点';
  const type = textOf(edge.type) || textOf(edge.label) || '关联';
  return `${from} -${type}-> ${to}`;
}

function formatProvenance(run) {
  const provenance = (run && run.provenance) || {};
  const context = (run && run.structured_context) || {};
  const rules = asArray(provenance.ruleHits || context.rules)
    .slice(0, 5)
    .map((rule, index) => titleOf(rule, `规则 ${index + 1}`));
  const knowledge = asArray(provenance.knowledgeSources || context.knowledge)
    .slice(0, 5)
    .map((item, index) => titleOf(item, `知识 ${index + 1}`));
  const paths = asArray(provenance.graphEdges || context.graphEdges)
    .slice(0, 5)
    .map(edgeText);

  return {
    rules,
    knowledge,
    paths,
  };
}

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
    provenanceSummary: formatProvenance(run),
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

function formatElements(elements) {
  if (!elements || typeof elements !== 'object') return [];
  const entries = Object.keys(elements).map((name) => ({ name, value: Number(elements[name]) || 0 }));
  const max = Math.max(1, ...entries.map((e) => e.value));
  return entries.map((e) => ({ ...e, percent: Math.round((e.value / max) * 100) }));
}

const reTestPages = {
  life: 'life',
  relationship: 'relationship',
  question: 'question',
  space: 'space',
};

Page({
  data: {
    report: null,
    elementList: [],
    historyRuns: [],
    selectedRunId: '',
    loadingHistory: false,
  },

  onLoad() {
    const app = getApp();
    const report = app.globalData.currentReport || wx.getStorageSync('lastReport') || buildFallbackReport('life');
    this.setReport(report);
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  // 统一设置当前报告，并派生五行可视化数据
  setReport(report) {
    if (!report) return;
    this.setData({
      report,
      elementList: formatElements(report.elements),
    });
  },

  loadHistory() {
    this.setData({ loadingHistory: true });
    api.listReportRuns()
      .then((data) => {
        const historyRuns = (data.reportRuns || []).map(formatHistoryRun);
        this.setData({
          historyRuns,
          // 仅在尚未选择时默认选中第一条历史，绝不覆盖当前正在查看的报告
          selectedRunId: this.data.selectedRunId || historyRuns[0]?.id || '',
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
          this.setReport(report);
        }
      })
      .catch(() => {
        const run = this.data.historyRuns.find((item) => item.id === id);
        const report = formatReportRun(run);
        if (report) {
          this.setReport(report);
        }
      });
  },

  reTest() {
    const kind = this.data.report && this.data.report.kind;
    const page = reTestPages[kind];
    if (!page) return;
    wx.navigateTo({ url: `/pages/${page}/index` });
  },

  onShareAppMessage() {
    const report = this.data.report || {};
    return {
      title: report.title ? `${report.title} · 甄好算` : '甄好算参考报告',
      path: '/pages/home/index',
    };
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/home/index',
    });
  },
});
