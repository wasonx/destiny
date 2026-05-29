import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type Payment = {
  id: string;
  order_id: string;
  provider: string;
  status: string;
  amount_cents: number;
  created_at?: string;
};

function money(value: number) {
  return (Number(value || 0) / 100).toFixed(2);
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  async function loadPayments() {
    const data = await adminRequest<{ payments: Payment[] }>('/payments');
    setPayments(data.payments || []);
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  async function markPaid(id: string) {
    setError('');
    try {
      await adminRequest(`/payments/${id}/mark-paid`, { method: 'POST', body: '{}' });
      await loadPayments();
    } catch {
      setError('支付状态更新失败');
    }
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-shadow-gray bg-white">
      <div className="flex items-center justify-between border-b border-shadow-gray p-5">
        <div>
          <h2 className="font-serif text-2xl">支付管理</h2>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <button onClick={() => void loadPayments()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
          <RefreshCcw className="h-4 w-4" />
          刷新
        </button>
      </div>
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
            <th className="px-4 py-3">支付单</th>
            <th>订单</th>
            <th>Provider</th>
            <th>状态</th>
            <th>金额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-shadow-gray last:border-0">
              <td className="max-w-[160px] truncate px-4 py-3 font-medium">{payment.id}</td>
              <td className="max-w-[160px] truncate">{payment.order_id}</td>
              <td>{payment.provider}</td>
              <td>{payment.status}</td>
              <td>{money(payment.amount_cents)}</td>
              <td>
                <button disabled={payment.status === 'paid'} onClick={() => void markPaid(payment.id)} className="inline-flex items-center gap-2 rounded-md bg-ink-blue px-3 py-2 text-white disabled:cursor-not-allowed disabled:bg-shadow-gray">
                  <CheckCircle2 className="h-4 w-4" />
                  标记已付
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
