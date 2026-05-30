import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type AuditLog = {
  id: string;
  actor_user_id?: string | null;
  actor_name?: string | null;
  action: string;
  target_type: string;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN');
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadAuditLogs() {
    const params = new URLSearchParams();
    if (action.trim()) params.set('action', action.trim());
    if (targetType.trim()) params.set('targetType', targetType.trim());
    if (targetId.trim()) params.set('targetId', targetId.trim());
    setError('');
    setLoading(true);
    try {
      const query = params.toString();
      const data = await adminRequest<{ auditLogs: AuditLog[] }>(`/audit-logs${query ? `?${query}` : ''}`);
      setAuditLogs(data.auditLogs || []);
    } catch {
      setError('审计日志读取失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-lg border border-shadow-gray bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shadow-gray p-5">
        <div>
          <h2 className="font-serif text-2xl">审计日志</h2>
          <p className="mt-1 text-sm text-on-surface-variant">查看发布、身份、权益、订单等敏感操作记录。</p>
        </div>
        <button onClick={() => void loadAuditLogs()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm" disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {loading ? '读取中' : '刷新'}
        </button>
      </div>

      <div className="grid gap-3 border-b border-shadow-gray p-5 md:grid-cols-4">
        <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="操作类型" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
        <input value={targetType} onChange={(event) => setTargetType(event.target.value)} placeholder="目标类型" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
        <input value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="目标 ID" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
        <button onClick={() => void loadAuditLogs()} className="rounded-md bg-ink-blue px-4 py-2 text-sm text-white" disabled={loading}>查询</button>
      </div>

      {error && <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
              <th className="px-4 py-3">时间</th>
              <th>操作人</th>
              <th>操作类型</th>
              <th>目标类型</th>
              <th>目标 ID</th>
              <th>元数据</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((item) => (
              <tr key={item.id} className="border-b border-shadow-gray last:border-0">
                <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                <td>{item.actor_name || item.actor_user_id || '-'}</td>
                <td className="font-mono text-xs">{item.action}</td>
                <td>{item.target_type}</td>
                <td className="font-mono text-xs">{item.target_id || '-'}</td>
                <td>
                  <pre className="max-h-24 max-w-[360px] overflow-auto rounded-md bg-surface p-2 text-xs">
                    {JSON.stringify(item.metadata || {}, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {!auditLogs.length && (
              <tr>
                <td className="px-4 py-8 text-center text-on-surface-variant" colSpan={6}>暂无审计日志</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
