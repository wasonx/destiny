import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type ReportRun = {
  id: string;
  report_kind?: string;
  report_tier?: string;
  input_params?: Record<string, unknown>;
  structured_context?: {
    rules?: unknown[];
    knowledge?: unknown[];
    template?: unknown;
  };
  final_report?: Record<string, unknown>;
  provenance?: {
    graphNodes?: unknown[];
    graphEdges?: unknown[];
    ruleHits?: unknown[];
    knowledgeSources?: unknown[];
    templateSnapshot?: unknown;
    safetySnapshot?: unknown;
  };
  source?: string;
  created_at?: string;
};

function jsonBlock(value: unknown) {
  return JSON.stringify(value || {}, null, 2);
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('zh-CN');
}

export default function ReportRunsPage() {
  const [reportRuns, setReportRuns] = useState<ReportRun[]>([]);
  const [selected, setSelected] = useState<ReportRun | null>(null);
  const [error, setError] = useState('');

  async function loadReportRuns() {
    setError('');
    try {
      const data = await adminRequest<{ reportRuns: ReportRun[] }>('/report-runs');
      setReportRuns(data.reportRuns || []);
      setSelected((current) => current || data.reportRuns?.[0] || null);
    } catch {
      setError('报告记录读取失败');
    }
  }

  async function loadReportRun(id: string) {
    setError('');
    try {
      const data = await adminRequest<{ reportRun: ReportRun | null }>(`/report-runs/${encodeURIComponent(id)}`);
      setSelected(data.reportRun);
    } catch {
      setError('报告详情读取失败');
    }
  }

  useEffect(() => {
    void loadReportRuns();
  }, []);

  const ruleHits = selected?.provenance?.ruleHits || selected?.structured_context?.rules || [];
  const knowledgeSources = selected?.provenance?.knowledgeSources || selected?.structured_context?.knowledge || [];
  const graphPath = {
    nodes: selected?.provenance?.graphNodes || [],
    edges: selected?.provenance?.graphEdges || [],
  };
  const safety = selected?.provenance?.safetySnapshot || {};

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-shadow-gray bg-white">
        <div className="flex items-center justify-between border-b border-shadow-gray p-5">
          <h2 className="font-serif text-2xl">报告记录</h2>
          <button onClick={() => void loadReportRuns()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </div>
        <div className="max-h-[720px] overflow-auto">
          {reportRuns.map((run) => (
            <button key={run.id} onClick={() => void loadReportRun(run.id)} className={`block w-full border-b border-shadow-gray px-4 py-3 text-left text-sm last:border-0 ${selected?.id === run.id ? 'bg-surface' : ''}`}>
              <div className="font-medium">{run.report_kind || '报告'} · {run.report_tier || 'free'}</div>
              <div className="mt-1 truncate text-xs text-on-surface-variant">{run.id}</div>
              <div className="mt-1 text-xs text-on-surface-variant">{formatDate(run.created_at)} · {run.source || '-'}</div>
            </button>
          ))}
          {!reportRuns.length && <p className="p-5 text-sm text-on-surface-variant">暂无报告记录</p>}
        </div>
      </section>

      <section className="space-y-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {selected?.id && (
          <div className="flex justify-end">
            <a href={`/admin?view=ontology&mode=report&target=${encodeURIComponent(selected.id)}&depth=2`} className="rounded-md border border-shadow-gray bg-white px-4 py-2 text-sm">
              查看图谱
            </a>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-shadow-gray bg-white p-5">
            <h3 className="font-serif text-xl">输入参数</h3>
            <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-surface p-3 text-xs">{jsonBlock(selected?.input_params)}</pre>
          </div>
          <div className="rounded-lg border border-shadow-gray bg-white p-5">
            <h3 className="font-serif text-xl">安全审查</h3>
            <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-surface p-3 text-xs">{jsonBlock(safety)}</pre>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-shadow-gray bg-white p-5">
            <h3 className="font-serif text-xl">命中规则</h3>
            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-surface p-3 text-xs">{jsonBlock(ruleHits)}</pre>
          </div>
          <div className="rounded-lg border border-shadow-gray bg-white p-5">
            <h3 className="font-serif text-xl">知识来源</h3>
            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-surface p-3 text-xs">{jsonBlock(knowledgeSources)}</pre>
          </div>
        </div>
        <div className="rounded-lg border border-shadow-gray bg-white p-5">
          <h3 className="font-serif text-xl">图谱路径</h3>
          <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-surface p-3 text-xs">{jsonBlock(graphPath)}</pre>
        </div>
      </section>
    </div>
  );
}
