import React from 'react';

export default function OpsPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">运行健康</h2>
      <div className="grid gap-4 md:grid-cols-4">
        {['Node/Express API', 'PostgreSQL', 'Neo4j', '商城服务'].map((item) => <div key={item} className="rounded-md bg-report-bg p-4">{item}</div>)}
      </div>
    </div>
  );
}
