import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { adminRequest } from '../api';

type RefundRequest = {
  id: string;
  order_id: string;
  item_sku?: string;
  customer_id: string;
  reason: string;
  amount_cents: number;
  status: string;
  review_note?: string;
  created_at?: string;
};

function money(value: number) {
  return (Number(value || 0) / 100).toFixed(2);
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function loadRefunds() {
    const data = await adminRequest<{ refundRequests: RefundRequest[] }>('/refund-requests');
    setRefunds(data.refundRequests || []);
  }

  useEffect(() => {
    void loadRefunds();
  }, []);

  async function review(id: string, status: 'approved' | 'rejected') {
    await adminRequest(`/refund-requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, note: notes[id] || '' }),
    });
    await loadRefunds();
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-shadow-gray bg-white">
      <div className="border-b border-shadow-gray p-5">
        <h2 className="font-serif text-2xl">退款管理</h2>
      </div>
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
            <th className="px-4 py-3">申请</th>
            <th>订单</th>
            <th>客户</th>
            <th>金额</th>
            <th>原因</th>
            <th>状态</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((refund) => (
            <tr key={refund.id} className="border-b border-shadow-gray last:border-0">
              <td className="max-w-[120px] truncate px-4 py-3 font-medium">{refund.id}</td>
              <td className="max-w-[120px] truncate">{refund.order_id}</td>
              <td className="max-w-[120px] truncate">{refund.customer_id}</td>
              <td>{money(refund.amount_cents)}</td>
              <td className="max-w-[180px] truncate">{refund.reason}</td>
              <td>{refund.status}</td>
              <td>
                <input value={notes[refund.id] || refund.review_note || ''} onChange={(event) => setNotes({ ...notes, [refund.id]: event.target.value })} className="w-40 rounded-md border border-shadow-gray px-3 py-2" />
              </td>
              <td className="space-x-2">
                <button onClick={() => void review(refund.id, 'approved')} className="inline-flex items-center gap-1 rounded-md bg-serene-teal px-3 py-2 text-white">
                  <Check className="h-4 w-4" />
                  通过
                </button>
                <button onClick={() => void review(refund.id, 'rejected')} className="inline-flex items-center gap-1 rounded-md border border-shadow-gray px-3 py-2">
                  <X className="h-4 w-4" />
                  拒绝
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
