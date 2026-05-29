import React from 'react';

export default function TemplatesPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h2 className="font-serif text-2xl mb-4">报告模板</h2>
        <div className="mb-4 rounded-md bg-surface px-3 py-2 text-sm">版本 1 · 支持免费版 / 完整版</div>
        <input placeholder="模板名称" className="mb-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <select className="mb-3 w-full rounded-md border border-shadow-gray px-3 py-2">
          <option>免费版 / 完整版</option>
          <option>免费版</option>
          <option>完整版</option>
        </select>
        <textarea placeholder="段落结构 JSON" className="min-h-64 w-full rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" />
        <textarea placeholder="免责声明" className="mt-3 min-h-20 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <input placeholder="禁用表达，用逗号分隔" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <input placeholder="变更摘要" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <div className="mt-4 flex gap-3">
          <button className="rounded-md border border-shadow-gray px-4 py-2">保存草稿</button>
          <button className="rounded-md bg-ink-blue px-4 py-2 text-white">发布</button>
          <button className="rounded-md border border-shadow-gray px-4 py-2 text-cinnabar">停用</button>
        </div>
      </section>
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h3 className="font-serif text-xl mb-4">模板预览</h3>
        <p className="text-sm text-on-surface-variant">语气：亲民、克制、可解释</p>
        <p className="mt-4 text-sm">免责声明和禁用表达会在生成前统一校验。</p>
      </section>
    </div>
  );
}
