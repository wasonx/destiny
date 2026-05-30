import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type SmsLog = {
  id: string;
  phone: string;
  purpose: string;
  provider: string;
  status: string;
  template_id?: string | null;
  sign_name?: string | null;
  provider_payload?: Record<string, unknown>;
  created_at?: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN');
}

function statusLabel(status: string) {
  if (status === 'mock_sent') return '模拟发送';
  if (status === 'blocked') return '已拦截';
  if (status === 'failed') return '发送失败';
  return status;
}

export default function SmsLogsPage() {
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('mock');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadSmsLogs() {
    const params = new URLSearchParams();
    if (phone.trim()) params.set('phone', phone.trim());
    if (status.trim()) params.set('status', status.trim());
    if (provider.trim()) params.set('provider', provider.trim());
    setError('');
    setLoading(true);
    try {
      const query = params.toString();
      const data = await adminRequest<{ smsLogs: SmsLog[] }>(`/sms-delivery-logs${query ? `?${query}` : ''}`);
      setSmsLogs(data.smsLogs || []);
    } catch {
      setError('短信日志读取失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSmsLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-lg border border-shadow-gray bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shadow-gray p-5">
        <div>
          <h2 className="font-serif text-2xl">短信日志</h2>
          <p className="mt-1 text-sm text-on-surface-variant">查看手机号验证码的模拟发送记录，确认 provider 保持 mock。</p>
        </div>
        <button onClick={() => void loadSmsLogs()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm" disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {loading ? '读取中' : '刷新'}
        </button>
      </div>

      <div className="grid gap-3 border-b border-shadow-gray p-5 md:grid-cols-4">
        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="手机号" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-shadow-gray px-3 py-2 text-sm">
          <option value="">全部状态</option>
          <option value="mock_sent">模拟发送</option>
          <option value="blocked">已拦截</option>
          <option value="failed">发送失败</option>
        </select>
        <input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="provider" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
        <button onClick={() => void loadSmsLogs()} className="rounded-md bg-ink-blue px-4 py-2 text-sm text-white" disabled={loading}>查询</button>
      </div>

      {error && <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
              <th className="px-4 py-3">时间</th>
              <th>手机号</th>
              <th>用途</th>
              <th>provider</th>
              <th>状态</th>
              <th>template_id</th>
              <th>sign_name</th>
              <th>provider_payload</th>
            </tr>
          </thead>
          <tbody>
            {smsLogs.map((item) => (
              <tr key={item.id} className="border-b border-shadow-gray last:border-0">
                <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                <td>{item.phone}</td>
                <td>{item.purpose}</td>
                <td className="font-mono text-xs">{item.provider}</td>
                <td>{statusLabel(item.status)}</td>
                <td className="font-mono text-xs">{item.template_id || '-'}</td>
                <td>{item.sign_name || '-'}</td>
                <td>
                  <pre className="max-h-24 max-w-[360px] overflow-auto rounded-md bg-surface p-2 text-xs">
                    {JSON.stringify(item.provider_payload || {}, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {!smsLogs.length && (
              <tr>
                <td className="px-4 py-8 text-center text-on-surface-variant" colSpan={8}>暂无短信日志</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
