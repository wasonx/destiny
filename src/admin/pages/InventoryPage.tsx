import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { adminRequest } from '../api';

type InventoryRow = {
  sku: string;
  quantity: number;
  safety_stock: number;
  updated_at?: string;
};

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [edits, setEdits] = useState<Record<string, InventoryRow>>({});

  async function loadInventory() {
    const data = await adminRequest<{ inventory: InventoryRow[] }>('/inventory');
    setRows(data.inventory || []);
    setEdits(Object.fromEntries((data.inventory || []).map((row) => [row.sku, row])));
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  async function saveRow(sku: string) {
    const row = edits[sku];
    await adminRequest(`/inventory/${encodeURIComponent(sku)}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: Number(row.quantity), safety_stock: Number(row.safety_stock) }),
    });
    await loadInventory();
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-shadow-gray bg-white">
      <div className="border-b border-shadow-gray p-5">
        <h2 className="font-serif text-2xl">库存管理</h2>
      </div>
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
            <th className="px-4 py-3">SKU</th>
            <th>当前库存</th>
            <th>安全库存</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const edit = edits[row.sku] || row;
            return (
              <tr key={row.sku} className="border-b border-shadow-gray last:border-0">
                <td className="px-4 py-3 font-medium">{row.sku}</td>
                <td>
                  <input value={edit.quantity} onChange={(event) => setEdits({ ...edits, [row.sku]: { ...edit, quantity: Number(event.target.value) } })} className="w-24 rounded-md border border-shadow-gray px-3 py-2" />
                </td>
                <td>
                  <input value={edit.safety_stock} onChange={(event) => setEdits({ ...edits, [row.sku]: { ...edit, safety_stock: Number(event.target.value) } })} className="w-24 rounded-md border border-shadow-gray px-3 py-2" />
                </td>
                <td>{row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}</td>
                <td>
                  <button onClick={() => void saveRow(row.sku)} className="inline-flex items-center gap-2 rounded-md bg-serene-teal px-3 py-2 text-white">
                    <Save className="h-4 w-4" />
                    保存
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
