import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Link2, Lock, Users } from 'lucide-react';
import Report from './Report';
import { generateInsight, InsightReport } from '../lib/insights';

const relationTypes = ['恋人', '夫妻', '亲子', '朋友', '合伙', '同事'];

export default function Relationship() {
  const [relationType, setRelationType] = useState('恋人');
  const [reportTier, setReportTier] = useState<'free' | 'full'>('free');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<InsightReport | null>(null);

  if (loading || report) {
    return <Report loading={loading} report={report} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <section className="text-center space-y-3">
        <h2 className="font-serif text-3xl text-ink-blue">合缘 · 双人关系</h2>
        <p className="text-on-surface-variant text-sm md:text-base max-w-lg mx-auto">
          看见两个人的吸引、冲突与相处节奏。
        </p>
      </section>

      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const form = new FormData(e.currentTarget);
          const payload = Object.fromEntries(form.entries());
          const nextReport = await generateInsight({
            kind: 'relationship',
            payload: { ...payload, relationType },
            tier: reportTier,
          });
          setReport(nextReport);
          setLoading(false);
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {[
            ['我的信息', 'self'],
            ['对方信息', 'other'],
          ].map(([title, prefix]) => (
            <section key={prefix} className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-serene-teal" />
                <h3 className="font-serif text-xl text-ink-blue">{title}</h3>
              </div>
              <div className="space-y-5">
                <label className="block">
                  <span className="block font-mono text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">出生日期</span>
                  <input name={`${prefix}Birthdate`} type="date" required className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 focus:border-ink-blue" />
                </label>
                <label className="block">
                  <span className="block font-mono text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">出生时间</span>
                  <input name={`${prefix}Birthtime`} type="time" className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 focus:border-ink-blue" />
                </label>
                <label className="block">
                  <span className="block font-mono text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">出生地</span>
                  <input name={`${prefix}Birthplace`} required placeholder="城市/地区" className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 focus:border-ink-blue placeholder-shadow-gray/50" />
                </label>
              </div>
            </section>
          ))}
        </div>

        <section className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-wisdom-gold" />
            <h3 className="font-serif text-xl text-ink-blue">关系类型</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {relationTypes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRelationType(item)}
                className={`px-4 py-2 rounded-full border text-sm transition-colors ${relationType === item ? 'border-serene-teal bg-serene-teal text-white' : 'border-shadow-gray text-ink-blue hover:bg-surface'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="block font-mono text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">当前最想了解的问题</span>
            <textarea
              name="question"
              rows={3}
              placeholder="例如：我们接下来适合继续推进关系吗？"
              className="w-full bg-report-bg border border-shadow-gray rounded-xl p-4 text-ink-blue placeholder:text-on-surface-variant/40 resize-none focus:border-ink-blue"
            />
          </label>
        </section>

        <section className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm">
          <p className="font-mono text-[10px] text-on-surface-variant mb-3 uppercase tracking-wider">报告版本</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setReportTier('free')}
              className={`rounded-xl border px-4 py-3 text-sm transition-colors ${reportTier === 'free' ? 'border-serene-teal bg-serene-teal text-white' : 'border-shadow-gray text-ink-blue hover:bg-surface'}`}
            >
              免费体验版
            </button>
            <button
              type="button"
              onClick={() => setReportTier('full')}
              className={`rounded-xl border px-4 py-3 text-sm transition-colors ${reportTier === 'full' ? 'border-serene-teal bg-serene-teal text-white' : 'border-shadow-gray text-ink-blue hover:bg-surface'}`}
            >
              完整版
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">免费体验版先看摘要，完整版会校验并消耗报告权益。</p>
        </section>

        <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant opacity-70">
          <Lock className="w-4 h-4" />
          <span>双方信息仅用于生成本次关系报告。</span>
        </div>

        <button className="w-full bg-ink-blue text-white py-4 px-6 rounded-xl font-serif text-xl flex justify-center items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md">
          <span>生成关系报告</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </motion.div>
  );
}
