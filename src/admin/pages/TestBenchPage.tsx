import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { adminRequest } from '../api';

type PillarKey = 'year' | 'month' | 'day' | 'hour';

const labels: Array<[PillarKey, string]> = [
  ['year', '年柱'],
  ['month', '月柱'],
  ['day', '日柱'],
  ['hour', '时柱'],
];

const initialPillars = {
  year: { stem: '甲', branch: '子' },
  month: { stem: '丙', branch: '寅' },
  day: { stem: '戊', branch: '辰' },
  hour: { stem: '庚', branch: '申' },
};

export default function TestBenchPage() {
  const [pillars, setPillars] = useState(initialPillars);
  const [result, setResult] = useState('等待运行');
  const [error, setError] = useState('');

  async function run() {
    setError('');
    try {
      const data = await adminRequest<Record<string, unknown>>('/testbench/four-pillars', {
        method: 'POST',
        body: JSON.stringify(pillars),
      });
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setError('测试运行失败');
    }
  }

  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">测试台</h2>
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        {labels.map(([key, label]) => (
          <fieldset key={key} className="rounded-md border border-shadow-gray p-3">
            <legend className="px-1 text-sm text-on-surface-variant">{label}</legend>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={pillars[key].stem}
                onChange={(event) => setPillars({ ...pillars, [key]: { ...pillars[key], stem: event.target.value } })}
                aria-label={`${label}天干`}
                className="rounded-md border border-shadow-gray px-3 py-2"
              />
              <input
                value={pillars[key].branch}
                onChange={(event) => setPillars({ ...pillars, [key]: { ...pillars[key], branch: event.target.value } })}
                aria-label={`${label}地支`}
                className="rounded-md border border-shadow-gray px-3 py-2"
              />
            </div>
          </fieldset>
        ))}
      </div>
      <button onClick={() => void run()} className="inline-flex items-center gap-2 rounded-md bg-serene-teal px-4 py-2 text-white">
        <Play className="h-4 w-4" />
        运行四柱分析
      </button>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <pre className="mt-4 overflow-auto rounded-md bg-report-bg p-4 text-xs">{result}</pre>
    </div>
  );
}
