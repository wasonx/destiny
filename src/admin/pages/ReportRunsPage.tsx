import React from 'react';

export default function ReportRunsPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">报告记录</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {['输入参数', '命中规则', '安全审查 flags'].map((item) => (
          <div key={item} className="rounded-md border border-shadow-gray bg-report-bg p-4">
            <p className="font-medium">{item}</p>
            <p className="mt-2 text-sm text-on-surface-variant">用于追溯每份报告的生成依据。</p>
          </div>
        ))}
      </div>
    </div>
  );
}
