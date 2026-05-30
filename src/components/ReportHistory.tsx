import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { CustomerReportRun, fetchCustomerReportRun, fetchCustomerReportRuns } from '../lib/customerAuth';

const kindLabels: Record<string, string> = {
  life: '照见',
  relationship: '合缘',
  question: '问时',
  space: '安居',
};

function formatTime(value?: string) {
  if (!value) return '时间未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getReport(run: CustomerReportRun | null) {
  return (run?.final_report || {}) as {
    title?: string;
    subtitle?: string;
    summary?: string;
    keywords?: string[];
    sections?: Array<{ title?: string; content?: string; points?: string[] }>;
    actions?: string[];
    disclaimer?: string;
  };
}

export default function ReportHistory() {
  const [runs, setRuns] = useState<CustomerReportRun[]>([]);
  const [selected, setSelected] = useState<CustomerReportRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadRuns() {
    setLoading(true);
    setMessage('');
    try {
      const data = await fetchCustomerReportRuns();
      const nextRuns = data.reportRuns || [];
      setRuns(nextRuns);
      if (nextRuns[0]) {
        await loadDetail(nextRuns[0].id, nextRuns[0]);
      } else {
        setSelected(null);
      }
    } catch (error) {
      setMessage('报告历史获取失败，请稍后再试');
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string, fallback?: CustomerReportRun) {
    try {
      const data = await fetchCustomerReportRun(id);
      setSelected(data.reportRun || fallback || null);
    } catch (error) {
      setSelected(fallback || null);
      setMessage('报告详情获取失败，已显示列表摘要');
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  const activeReport = useMemo(() => getReport(selected), [selected]);
  const keywords = asArray(activeReport.keywords);
  const actions = asArray(activeReport.actions);
  const tier = selected?.report_tier === 'full' ? '完整版' : '免费体验版';
  const kind = selected?.report_kind ? kindLabels[selected.report_kind] || selected.report_kind : '报告';

  return (
    <div className="space-y-6 py-4">
      <section className="flex flex-col gap-4 border-b border-shadow-gray pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase text-wisdom-gold">REPORT HISTORY</p>
          <h2 className="mt-2 font-serif text-2xl text-ink-blue">报告历史</h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">查看已经生成的免费版和完整版报告，复核当时输入、报告摘要与安全边界。</p>
        </div>
        <button
          onClick={loadRuns}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-shadow-gray px-4 py-3 text-sm text-ink-blue transition-colors hover:bg-surface disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </section>

      {message ? <p className="rounded-lg border border-wisdom-gold/30 bg-wisdom-gold/10 px-4 py-3 text-sm text-ink-blue">{message}</p> : null}

      {!runs.length && !loading ? (
        <section className="rounded-lg border border-shadow-gray bg-white p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-serene-teal" />
          <h3 className="mt-3 font-serif text-xl text-ink-blue">暂无报告记录</h3>
          <p className="mt-2 text-sm text-on-surface-variant">生成第一份报告后，这里会显示历史记录。</p>
        </section>
      ) : null}

      {runs.length ? (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <section className="space-y-3">
            {runs.map((run) => {
              const isActive = selected?.id === run.id;
              return (
                <button
                  key={run.id}
                  onClick={() => loadDetail(run.id, run)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${isActive ? 'border-serene-teal bg-serene-teal/10' : 'border-shadow-gray bg-white hover:bg-surface'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-serif text-lg text-ink-blue">{kindLabels[run.report_kind || ''] || run.report_kind || '报告'}</span>
                    <span className="rounded-md border border-shadow-gray bg-white px-2 py-1 text-xs text-on-surface-variant">{run.report_tier === 'full' ? '完整版' : '免费版'}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant">
                    <CalendarClock className="h-4 w-4" />
                    {formatTime(run.created_at)}
                  </div>
                </button>
              );
            })}
          </section>

          <section className="space-y-5 rounded-lg border border-shadow-gray bg-white p-5">
            <div className="flex flex-col gap-3 border-b border-shadow-gray pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-2xl text-ink-blue">{activeReport.title || `${kind}详情`}</h3>
                  <span className="rounded-md border border-wisdom-gold/40 bg-wisdom-gold/10 px-3 py-1 text-xs text-ink-blue">{tier}</span>
                </div>
                <p className="text-sm text-on-surface-variant">{activeReport.subtitle || '已保存的报告记录'}</p>
              </div>
              <div className="text-sm text-on-surface-variant">{formatTime(selected?.created_at)}</div>
            </div>

            {keywords.length ? (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-shadow-gray px-3 py-1 text-xs text-ink-blue">{keyword}</span>
                ))}
              </div>
            ) : null}

            <div>
              <h4 className="font-serif text-lg text-ink-blue">核心摘要</h4>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{activeReport.summary || '暂无摘要内容。'}</p>
            </div>

            {(activeReport.sections || []).map((section, index) => (
              <div key={`${section.title || 'section'}-${index}`} className="border-t border-shadow-gray pt-4">
                <h4 className="font-serif text-lg text-ink-blue">{section.title || `段落 ${index + 1}`}</h4>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{section.content || '暂无段落内容。'}</p>
                {section.points?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {section.points.map((point) => (
                      <span key={point} className="rounded-md bg-report-bg px-3 py-1 text-xs text-on-surface-variant">{point}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {actions.length ? (
              <div className="border-t border-shadow-gray pt-4">
                <h4 className="font-serif text-lg text-ink-blue">行动建议</h4>
                <div className="mt-3 space-y-2">
                  {actions.map((action, index) => (
                    <div key={action} className="flex items-start gap-2 text-sm text-on-surface-variant">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-serene-teal/10 text-[11px] text-serene-teal">{index + 1}</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-2 border-t border-shadow-gray pt-4 text-xs leading-relaxed text-outline">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-serene-teal" />
              <span>{activeReport.disclaimer || '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。'}</span>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
