import React from 'react';

export default function PointsPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">积分账户</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {['当前积分', '累计积分', '成长等级'].map((item) => <div key={item} className="rounded-md bg-report-bg p-4">{item}</div>)}
      </div>
    </div>
  );
}
