import React from 'react';

export default function RulesPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h2 className="font-serif text-2xl mb-4">分析规则</h2>
        <div className="mb-4 rounded-md bg-surface px-3 py-2 text-sm">版本 1 · 草稿规则不会进入线上报告</div>
        <input placeholder="规则名称" className="mb-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <textarea className="min-h-72 w-full rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" defaultValue={'{\n  "all": [\n    {"field": "elements.木", "operator": "gte", "value": 2}\n  ]\n}'} />
        <input placeholder="关联知识，使用知识条目 ID 或标题" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <input placeholder="关联图谱节点，如 element.wood" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <textarea placeholder="风险边界" className="mt-3 min-h-24 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <input placeholder="变更摘要" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <div className="mt-4 flex gap-3">
          <button className="rounded-md border border-shadow-gray px-4 py-2">保存草稿</button>
          <button className="rounded-md bg-ink-blue px-4 py-2 text-white">发布</button>
          <button className="rounded-md border border-shadow-gray px-4 py-2 text-cinnabar">停用</button>
        </div>
      </section>
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h3 className="font-serif text-xl mb-4">规则测试</h3>
        <textarea placeholder="自然语言规则草稿" className="min-h-32 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <button className="mt-4 rounded-md bg-ink-blue px-4 py-2 text-white">测试运行</button>
      </section>
    </div>
  );
}
