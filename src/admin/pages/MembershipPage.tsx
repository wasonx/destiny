import React from 'react';

export default function MembershipPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">会员管理</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {['月度会员', '年度会员', '手动发放会员'].map((item) => <div key={item} className="rounded-md bg-report-bg p-4">{item}</div>)}
      </div>
    </div>
  );
}
