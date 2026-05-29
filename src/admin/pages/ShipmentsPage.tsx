import React, { useEffect, useState } from 'react';
import { Send, Truck } from 'lucide-react';
import { adminRequest } from '../api';

type Order = {
  id: string;
  order_no: string;
  status: string;
  items: Array<{ sku: string; name: string; quantity: number }>;
};

type Shipment = {
  id: string;
  order_id: string;
  carrier: string;
  tracking_no: string;
  shipped_at?: string;
};

type ShipForm = Record<string, { carrier: string; tracking_no: string }>;

export default function ShipmentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [forms, setForms] = useState<ShipForm>({});

  async function loadData() {
    const [orderData, shipmentData] = await Promise.all([
      adminRequest<{ orders: Order[] }>('/orders'),
      adminRequest<{ shipments: Shipment[] }>('/shipments'),
    ]);
    setOrders((orderData.orders || []).filter((order) => order.status === 'pending_fulfillment'));
    setShipments(shipmentData.shipments || []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function ship(orderId: string) {
    const form = forms[orderId] || { carrier: '', tracking_no: '' };
    await adminRequest(`/orders/${orderId}/ship`, {
      method: 'POST',
      body: JSON.stringify({ carrier: form.carrier, tracking_no: form.tracking_no }),
    });
    await loadData();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <h2 className="mb-4 font-serif text-2xl">发货管理</h2>
        <div className="space-y-3">
          {orders.map((order) => {
            const form = forms[order.id] || { carrier: '', tracking_no: '' };
            return (
              <div key={order.id} className="grid gap-3 border-t border-shadow-gray pt-3 md:grid-cols-[1fr_180px_180px_auto]">
                <div>
                  <p className="font-medium">{order.order_no}</p>
                  <p className="text-sm text-on-surface-variant">{(order.items || []).map((item) => `${item.name || item.sku} x${item.quantity}`).join('，')}</p>
                </div>
                <input value={form.carrier} onChange={(event) => setForms({ ...forms, [order.id]: { ...form, carrier: event.target.value } })} placeholder="快递公司" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
                <input value={form.tracking_no} onChange={(event) => setForms({ ...forms, [order.id]: { ...form, tracking_no: event.target.value } })} placeholder="快递单号" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
                <button onClick={() => void ship(order.id)} className="inline-flex items-center justify-center gap-2 rounded-md bg-serene-teal px-3 py-2 text-white">
                  <Send className="h-4 w-4" />
                  发货
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-shadow-gray bg-white">
        <div className="flex items-center gap-2 border-b border-shadow-gray p-5">
          <Truck className="h-5 w-5" />
          <h3 className="font-serif text-xl">发货记录</h3>
        </div>
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant"><th className="px-4 py-3">订单</th><th>快递公司</th><th>快递单号</th><th>时间</th></tr></thead>
          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment.id} className="border-b border-shadow-gray last:border-0">
                <td className="px-4 py-3">{shipment.order_id}</td>
                <td>{shipment.carrier}</td>
                <td>{shipment.tracking_no}</td>
                <td>{shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
