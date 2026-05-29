import React from 'react';

export default function EntitlementsPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">权益账户</h2>
      <p className="text-sm text-on-surface-variant mb-4">报告次数余额、发放记录、扣减记录和手动发放。</p>
      <button className="rounded-md bg-serene-teal px-4 py-2 text-white">发放报告次数</button>
    </div>
  );
}
