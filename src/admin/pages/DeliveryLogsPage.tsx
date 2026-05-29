import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type DeliveryLog = {
  id: string;
  order_id: string;
  item_sku: string;
  delivery_type: string;
  status: string;
  payload: Record<string, unknown>;
  delivered_at?: string;
};

export default function DeliveryLogsPage() {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);

  async function loadLogs() {
    const data = await adminRequest<{ deliveryLogs: DeliveryLog[] }>('/delivery-logs');
    setLogs(data.deliveryLogs || []);
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <section className="overflow-x-auto rounded-lg border border-shadow-gray bg-white">
      <div className="flex items-center justify-between border-b border-shadow-gray p-5">
        <h2 className="font-serif text-2xl">发放记录</h2>
        <button onClick={() => void loadLogs()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
          <RefreshCcw className="h-4 w-4" />
          刷新
        </button>
      </div>
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
            <th className="px-4 py-3">订单</th>
            <th>SKU</th>
            <th>类型</th>
            <th>状态</th>
            <th>Payload</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-shadow-gray last:border-0">
              <td className="max-w-[140px] truncate px-4 py-3 font-medium">{log.order_id}</td>
              <td>{log.item_sku}</td>
              <td>{log.delivery_type}</td>
              <td>{log.status}</td>
              <td className="max-w-[260px] truncate">{JSON.stringify(log.payload || {})}</td>
              <td>{log.delivered_at ? new Date(log.delivered_at).toLocaleString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
