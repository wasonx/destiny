import React from 'react';

export default function TemplatesPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h2 className="font-serif text-2xl mb-4">报告模板</h2>
        <input placeholder="模板名称" className="mb-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
        <textarea placeholder="段落结构 JSON" className="min-h-64 w-full rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" />
      </section>
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h3 className="font-serif text-xl mb-4">模板预览</h3>
        <p className="text-sm text-on-surface-variant">语气：亲民、克制、可解释</p>
        <p className="mt-4 text-sm">免责声明和禁用表达会在生成前统一校验。</p>
      </section>
    </div>
  );
}
