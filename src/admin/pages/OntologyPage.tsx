import React, { useState } from 'react';

const concepts = ['天干', '地支', '五行', '阴阳', '十神', '四柱', '藏干', '合冲刑害破'];

export default function OntologyPage() {
  const [active, setActive] = useState('天干');

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h2 className="font-serif text-2xl mb-4">八字本体图谱</h2>
        <div className="grid gap-2">
          {concepts.map((item) => (
            <button key={item} onClick={() => setActive(item)} className={`rounded-md px-3 py-2 text-left ${active === item ? 'bg-serene-teal text-white' : 'bg-surface'}`}>{item}</button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-shadow-gray bg-white p-6">
        <h3 className="font-serif text-xl mb-4">{active}关系路径</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {['BELONGS_TO', 'GENERATES', 'RESTRAINS', 'CONFLICTS_WITH'].map((rel) => (
            <div key={rel} className="rounded-md border border-shadow-gray bg-report-bg p-4">
              <p className="font-mono text-xs text-wisdom-gold">{rel}</p>
              <p className="mt-2 text-sm">概念节点与关系可在这里查看和维护。</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
