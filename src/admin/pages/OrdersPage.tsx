import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type Order = {
  id: string;
  order_no: string;
  customer_id: string;
  status: string;
  amount_cents: number;
  freight_cents: number;
  items: Array<{ sku: string; name: string; quantity: number }>;
  address_snapshot?: Record<string, unknown>;
  created_at?: string;
};

function money(value: number) {
  return (Number(value || 0) / 100).toFixed(2);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function loadOrders() {
    const data = await adminRequest<{ orders: Order[] }>('/orders');
    setOrders(data.orders || []);
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <section className="overflow-x-auto rounded-lg border border-shadow-gray bg-white">
      <div className="flex items-center justify-between border-b border-shadow-gray p-5">
        <h2 className="font-serif text-2xl">订单管理</h2>
        <button onClick={() => void loadOrders()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
          <RefreshCcw className="h-4 w-4" />
          刷新
        </button>
      </div>
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
            <th className="px-4 py-3">订单号</th>
            <th>客户</th>
            <th>状态</th>
            <th>金额</th>
            <th>运费</th>
            <th>商品</th>
            <th>收货</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-shadow-gray last:border-0">
              <td className="px-4 py-3 font-medium">{order.order_no}</td>
              <td className="max-w-[140px] truncate">{order.customer_id}</td>
              <td>{order.status}</td>
              <td>{money(order.amount_cents)}</td>
              <td>{money(order.freight_cents)}</td>
              <td className="max-w-[260px] truncate">{(order.items || []).map((item) => `${item.name || item.sku} x${item.quantity}`).join('，')}</td>
              <td className="max-w-[220px] truncate">{order.address_snapshot ? JSON.stringify(order.address_snapshot) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
