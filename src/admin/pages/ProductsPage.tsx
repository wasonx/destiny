import React, { useEffect, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type Product = {
  id: string;
  sku: string;
  name: string;
  product_type: string;
  price_cents: number;
  currency: string;
  entitlement_payload: Record<string, unknown>;
  requires_shipping: boolean;
  status: string;
};

const initialForm = {
  sku: '',
  name: '',
  product_type: 'report_quota',
  price_cents: '990',
  entitlement_payload: '{"amount":3}',
  requires_shipping: false,
};

function formatCents(value: number) {
  return (Number(value || 0) / 100).toFixed(2);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  async function loadProducts() {
    const data = await adminRequest<{ products: Product[] }>('/products');
    setProducts(data.products || []);
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await adminRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          price_cents: Number(form.price_cents),
          entitlement_payload: JSON.parse(form.entitlement_payload || '{}'),
        }),
      });
      setForm(initialForm);
      await loadProducts();
    } catch {
      setError('商品保存失败');
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">商品管理</h2>
          <button onClick={() => void loadProducts()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </div>

        <form onSubmit={createProduct} className="grid gap-3 md:grid-cols-6">
          <input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="SKU" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="商品名称" className="rounded-md border border-shadow-gray px-3 py-2 text-sm md:col-span-2" />
          <select value={form.product_type} onChange={(event) => setForm({ ...form, product_type: event.target.value, requires_shipping: event.target.value === 'physical_goods' })} className="rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <option value="report_quota">报告次数包</option>
            <option value="monthly_membership">月度会员</option>
            <option value="yearly_membership">年度会员</option>
            <option value="digital_content">数字内容</option>
            <option value="physical_goods">实物商品</option>
          </select>
          <input value={form.price_cents} onChange={(event) => setForm({ ...form, price_cents: event.target.value })} placeholder="分" className="rounded-md border border-shadow-gray px-3 py-2 text-sm" />
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-ink-blue px-3 py-2 text-sm text-white">
            <Plus className="h-4 w-4" />
            新增
          </button>
          <textarea value={form.entitlement_payload} onChange={(event) => setForm({ ...form, entitlement_payload: event.target.value })} className="min-h-20 rounded-md border border-shadow-gray px-3 py-2 text-sm md:col-span-6" />
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="overflow-x-auto rounded-lg border border-shadow-gray bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
              <th className="px-4 py-3">SKU</th>
              <th>名称</th>
              <th>类型</th>
              <th>价格</th>
              <th>权益</th>
              <th>发货</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-shadow-gray last:border-0">
                <td className="px-4 py-3 font-medium">{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.product_type}</td>
                <td>{product.currency} {formatCents(product.price_cents)}</td>
                <td className="max-w-[220px] truncate">{JSON.stringify(product.entitlement_payload || {})}</td>
                <td>{product.requires_shipping ? '是' : '否'}</td>
                <td>{product.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
