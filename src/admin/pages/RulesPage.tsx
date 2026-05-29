import React from 'react';

export default function RulesPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h2 className="font-serif text-2xl mb-4">分析规则</h2>
        <textarea className="min-h-72 w-full rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" defaultValue={'{\n  "all": [\n    {"field": "elements.木", "operator": "gte", "value": 2}\n  ]\n}'} />
      </section>
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h3 className="font-serif text-xl mb-4">规则测试</h3>
        <textarea placeholder="自然语言规则草稿" className="min-h-32 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <button className="mt-4 rounded-md bg-ink-blue px-4 py-2 text-white">测试运行</button>
      </section>
    </div>
  );
}
