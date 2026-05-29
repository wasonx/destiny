import React, { useState } from 'react';

export default function TestBenchPage() {
  const [result, setResult] = useState('等待运行');

  async function run() {
    const response = await fetch('/destiny-api/admin/testbench/four-pillars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: { stem: '甲', branch: '子' },
        month: { stem: '丙', branch: '寅' },
        day: { stem: '戊', branch: '辰' },
        hour: { stem: '庚', branch: '申' },
      }),
    });
    setResult(JSON.stringify(await response.json(), null, 2));
  }

  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">测试台</h2>
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        {['年柱', '月柱', '日柱', '时柱'].map((label) => <input key={label} placeholder={label} className="rounded-md border border-shadow-gray px-3 py-2" />)}
      </div>
      <button onClick={run} className="rounded-md bg-serene-teal px-4 py-2 text-white">运行四柱分析</button>
      <pre className="mt-4 overflow-auto rounded-md bg-report-bg p-4 text-xs">{result}</pre>
    </div>
  );
}
