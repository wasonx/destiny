import React from 'react';

export default function ProductsPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">商品管理</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-on-surface-variant"><th className="py-2">SKU</th><th>商品类型</th><th>价格</th><th>权益 payload</th><th>发货</th></tr></thead>
        <tbody>
          <tr className="border-t border-shadow-gray"><td className="py-3">REPORT-3</td><td>报告次数包</td><td>9.90</td><td>3 次</td><td>否</td></tr>
          <tr className="border-t border-shadow-gray"><td className="py-3">CARD-001</td><td>实物商品</td><td>39.00</td><td>库存 SKU</td><td>是</td></tr>
        </tbody>
      </table>
    </div>
  );
}
