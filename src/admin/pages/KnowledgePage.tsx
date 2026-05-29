import React, { useState } from 'react';

export default function KnowledgePage() {
  const [status, setStatus] = useState('draft');

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h2 className="font-serif text-2xl mb-4">知识条目</h2>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="mb-4 w-full rounded-md border border-shadow-gray px-3 py-2">
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="disabled">已停用</option>
        </select>
        <div className="mb-4 rounded-md bg-surface px-3 py-2 text-sm">
          当前版本：版本 1 · 草稿变更不会进入线上报告
        </div>
        <button className="w-full rounded-md bg-serene-teal px-4 py-3 text-white">新建草稿</button>
      </section>
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <div className="grid gap-4">
          <input placeholder="标题" className="rounded-md border border-shadow-gray px-3 py-2" />
          <input placeholder="摘要" className="rounded-md border border-shadow-gray px-3 py-2" />
          <textarea placeholder="正文" className="min-h-40 rounded-md border border-shadow-gray px-3 py-2" />
          <input placeholder="标签，用逗号分隔" className="rounded-md border border-shadow-gray px-3 py-2" />
          <input placeholder="关联概念，如 wood、ten_god.resource" className="rounded-md border border-shadow-gray px-3 py-2" />
          <textarea placeholder="适用范围 JSON" className="min-h-20 rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" />
          <textarea placeholder="风险提示" className="min-h-24 rounded-md border border-shadow-gray px-3 py-2" />
          <input placeholder="变更摘要" className="rounded-md border border-shadow-gray px-3 py-2" />
          <div className="flex gap-3">
            <button className="rounded-md border border-shadow-gray px-4 py-2">保存草稿</button>
            <button className="rounded-md bg-ink-blue px-4 py-2 text-white">发布</button>
            <button className="rounded-md border border-shadow-gray px-4 py-2 text-cinnabar">停用</button>
          </div>
        </div>
      </section>
    </div>
  );
}
