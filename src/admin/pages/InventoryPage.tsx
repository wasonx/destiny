import React from 'react';

export default function InventoryPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">库存管理</h2>
      <p className="text-sm text-on-surface-variant">按 SKU 管理当前库存、安全库存和最近更新时间。未支付订单不锁库存，支付成功后扣减库存。</p>
    </div>
  );
}
