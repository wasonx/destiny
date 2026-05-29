import React from 'react';

export default function PaymentsPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">支付管理</h2>
      <p className="text-sm text-on-surface-variant">第一版支持人工标记支付成功，并保留微信支付占位 provider。</p>
      <button className="mt-4 rounded-md bg-ink-blue px-4 py-2 text-white">人工标记支付成功</button>
    </div>
  );
}
