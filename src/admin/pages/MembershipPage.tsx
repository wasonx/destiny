import React, { useState } from 'react';
import { Clock, RefreshCcw, Search, Send } from 'lucide-react';
import { adminRequest } from '../api';

type ValueState = {
  membership: { plan_code: string; expires_at?: string; status?: string } | null;
  reportQuotaBalance: number;
  points: {
    points_balance: number;
    lifetime_points: number;
    growth_level: string;
  };
};

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString('zh-CN');
}

export default function MembershipPage() {
  const [customerId, setCustomerId] = useState('');
  const [planCode, setPlanCode] = useState('monthly');
  const [durationDays, setDurationDays] = useState('31');
  const [state, setState] = useState<ValueState | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadValueState() {
    if (!customerId.trim()) {
      setError('请输入客户 ID');
      return;
    }
    setError('');
    setMessage('');
    try {
      const data = await adminRequest<ValueState>(`/customers/${customerId.trim()}/value-state`);
      setState(data);
    } catch {
      setError('查询账户失败');
    }
  }

  async function grantMembership(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId.trim()) {
      setError('请输入客户 ID');
      return;
    }
    setError('');
    setMessage('');
    try {
      const data = await adminRequest<{ membership: { plan_code: string; expires_at?: string; status?: string } }>(`/customers/${customerId.trim()}/grant-membership`, {
        method: 'POST',
        body: JSON.stringify({ planCode, durationDays: Number(durationDays || 31) }),
      });
      setState((current) => current ? { ...current, membership: data.membership } : current);
      setMessage('开通会员成功');
    } catch {
      setError('开通会员失败');
    }
  }

  async function expireOverdueMemberships() {
    setError('');
    setMessage('');
    try {
      const data = await adminRequest<{ expiredMemberships: Array<{ id: string }> }>('/memberships/expire-overdue', {
        method: 'POST',
      });
      if (customerId.trim()) {
        await loadValueState();
      }
      setMessage(`过期处理完成，更新 ${data.expiredMemberships.length} 条会员记录`);
    } catch {
      setError('会员过期处理失败');
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">会员管理</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void expireOverdueMemberships()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
              <Clock className="h-4 w-4" />
              过期处理
            </button>
            <button onClick={() => void loadValueState()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
              <RefreshCcw className="h-4 w-4" />
              刷新
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm">
            <span className="text-on-surface-variant">客户 ID</span>
            <input value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="rounded-md border border-shadow-gray px-3 py-2" />
          </label>
          <button onClick={() => void loadValueState()} className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink-blue px-4 text-sm text-white">
            <Search className="h-4 w-4" />
            查询账户
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-shadow-gray bg-white p-5">
          <div className="text-sm text-on-surface-variant">当前会员</div>
          <div className="mt-2 text-2xl font-semibold">{state?.membership?.plan_code || '未开通'}</div>
        </div>
        <div className="rounded-lg border border-shadow-gray bg-white p-5">
          <div className="text-sm text-on-surface-variant">到期时间</div>
          <div className="mt-2 text-xl font-semibold">{formatDate(state?.membership?.expires_at)}</div>
        </div>
        <div className="rounded-lg border border-shadow-gray bg-white p-5">
          <div className="text-sm text-on-surface-variant">报告次数余额</div>
          <div className="mt-2 text-3xl font-semibold">{state?.reportQuotaBalance ?? 0}</div>
        </div>
      </section>

      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <h3 className="mb-4 font-serif text-xl">开通会员</h3>
        <form onSubmit={grantMembership} className="grid gap-3 md:grid-cols-[180px_160px_auto]">
          <select value={planCode} onChange={(event) => setPlanCode(event.target.value)} className="rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <option value="monthly">月度会员</option>
            <option value="yearly">年度会员</option>
          </select>
          <input value={durationDays} onChange={(event) => setDurationDays(event.target.value)} type="number" min="1" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-serene-teal px-4 py-2 text-sm text-white">
            <Send className="h-4 w-4" />
            开通会员
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-serene-teal">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
