import React, { useState } from 'react';
import { RefreshCcw, Search, Send } from 'lucide-react';
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

export default function PointsPage() {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('20');
  const [reason, setReason] = useState('活动奖励');
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

  async function grantPoints(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId.trim()) {
      setError('请输入客户 ID');
      return;
    }
    setError('');
    setMessage('');
    try {
      const data = await adminRequest<{ points: { pointsBalance: number; lifetimePoints: number; growthLevel: string } }>(`/customers/${customerId.trim()}/grant-points`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount || 0), reason }),
      });
      setState((current) => current ? {
        ...current,
        points: {
          points_balance: data.points.pointsBalance,
          lifetime_points: data.points.lifetimePoints,
          growth_level: data.points.growthLevel,
        },
      } : current);
      setMessage('发放积分成功');
    } catch {
      setError('发放积分失败');
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">积分账户</h2>
          <button onClick={() => void loadValueState()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
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
          <div className="text-sm text-on-surface-variant">当前积分</div>
          <div className="mt-2 text-3xl font-semibold">{state?.points?.points_balance ?? 0}</div>
        </div>
        <div className="rounded-lg border border-shadow-gray bg-white p-5">
          <div className="text-sm text-on-surface-variant">累计积分</div>
          <div className="mt-2 text-3xl font-semibold">{state?.points?.lifetime_points ?? 0}</div>
        </div>
        <div className="rounded-lg border border-shadow-gray bg-white p-5">
          <div className="text-sm text-on-surface-variant">成长等级</div>
          <div className="mt-2 text-xl font-semibold">{state?.points?.growth_level || '启蒙'}</div>
        </div>
      </section>

      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <h3 className="mb-4 font-serif text-xl">发放积分</h3>
        <form onSubmit={grantPoints} className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
          <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
          <input value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-serene-teal px-4 py-2 text-sm text-white">
            <Send className="h-4 w-4" />
            发放积分
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-serene-teal">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
