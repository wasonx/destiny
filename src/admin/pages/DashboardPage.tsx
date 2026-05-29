import React from 'react';

const stats = [
  ['客户账号', '1,280'],
  ['后台账号', '3'],
  ['今日登录', '42'],
  ['待处理事项', '7'],
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-serif text-2xl mb-2">总览</h2>
        <p className="text-sm text-on-surface-variant">甄算知识库、报告、会员、订单和运维状态集中视图。</p>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-shadow-gray bg-white p-5">
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p className="mt-3 font-serif text-3xl">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
