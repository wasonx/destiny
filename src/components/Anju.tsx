import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Building2, Home, ImageUp, Lock, MapPin } from 'lucide-react';
import Report from './Report';
import { generateInsight, InsightReport } from '../lib/insights';

const focusOptions = ['整体格局', '睡眠休息', '亲子学习', '财富动线', '办公效率', '装修前评估'];

export default function Anju() {
  const [spaceType, setSpaceType] = useState('居家环境');
  const [focus, setFocus] = useState('整体格局');
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
        <h2 className="font-serif text-3xl text-ink-blue">安居 · 环境分析</h2>
        <p className="text-on-surface-variant text-sm md:text-base max-w-lg mx-auto">
          上传空间资料，生成居家或办公环境分析与调整建议。
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
            kind: 'space',
            payload: { ...payload, spaceType, focus },
            tier: reportTier,
          });
          setReport(nextReport);
          setLoading(false);
        }}
      >
        <section className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['居家环境', Home],
              ['办公环境', Building2],
            ].map(([label, Icon]) => {
              const TypedIcon = Icon as typeof Home;
              return (
                <button
                  key={String(label)}
                  type="button"
                  onClick={() => setSpaceType(String(label))}
                  className={`py-4 rounded-xl border transition-colors flex flex-col items-center gap-2 ${spaceType === label ? 'bg-ink-blue text-white border-ink-blue' : 'border-shadow-gray text-ink-blue hover:bg-surface'}`}
                >
                  <TypedIcon className="w-5 h-5" />
                  <span>{String(label)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <ImageUp className="w-5 h-5 text-serene-teal" />
              <h3 className="font-serif text-xl text-ink-blue">户型图</h3>
            </div>
            <label className="flex flex-col items-center justify-center min-h-44 border border-dashed border-shadow-gray rounded-xl bg-report-bg text-center p-6 cursor-pointer hover:border-serene-teal transition-colors">
              <ImageUp className="w-8 h-8 text-serene-teal mb-3" />
              <span className="font-medium text-ink-blue">上传户型图或平面图</span>
              <span className="text-xs text-on-surface-variant mt-2">MVP 阶段会记录文件名，后续接入图像识别与专家复核。</span>
              <input name="floorPlan" type="file" accept="image/*,.pdf" className="hidden" />
            </label>
          </div>

          <div className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <ImageUp className="w-5 h-5 text-wisdom-gold" />
              <h3 className="font-serif text-xl text-ink-blue">环境照片</h3>
            </div>
            <label className="flex flex-col items-center justify-center min-h-44 border border-dashed border-shadow-gray rounded-xl bg-report-bg text-center p-6 cursor-pointer hover:border-wisdom-gold transition-colors">
              <ImageUp className="w-8 h-8 text-wisdom-gold mb-3" />
              <span className="font-medium text-ink-blue">上传入户、客厅、卧室等照片</span>
              <span className="text-xs text-on-surface-variant mt-2">建议至少包含入户门、主要活动区和关注空间。</span>
              <input name="photos" type="file" accept="image/*" multiple className="hidden" />
            </label>
          </div>
        </section>

        <section className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm space-y-6">
          <label className="block">
            <span className="block font-mono text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">城市或区域</span>
            <div className="relative">
              <input name="area" required placeholder="例如：成都高新区" className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 pr-9 focus:border-ink-blue placeholder-shadow-gray/50" />
              <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-shadow-gray" />
            </div>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <label className="block">
              <span className="block font-mono text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">房屋朝向</span>
              <input name="direction" placeholder="例如：坐北朝南" className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 focus:border-ink-blue placeholder-shadow-gray/50" />
            </label>
            <label className="block">
              <span className="block font-mono text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">入户门位置</span>
              <input name="entrance" placeholder="例如：西南侧" className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 focus:border-ink-blue placeholder-shadow-gray/50" />
            </label>
          </div>
          <label className="block">
            <span className="block font-mono text-[10px] text-on-surface-variant mb-2 uppercase tracking-wider">当前最想改善的问题</span>
            <textarea name="question" rows={3} placeholder="例如：睡眠不好、客厅动线乱、办公室协作效率低" className="w-full bg-report-bg border border-shadow-gray rounded-xl p-4 text-ink-blue placeholder:text-on-surface-variant/40 resize-none focus:border-ink-blue" />
          </label>
          <div>
            <p className="font-mono text-[10px] text-on-surface-variant mb-3 uppercase tracking-wider">分析重点</p>
            <div className="flex flex-wrap gap-2">
              {focusOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFocus(item)}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${focus === item ? 'border-serene-teal bg-serene-teal text-white' : 'border-shadow-gray text-ink-blue hover:bg-surface'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
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
          <span>可隐藏详细门牌号，资料仅用于生成环境分析报告。</span>
        </div>

        <button className="w-full bg-ink-blue text-white py-4 px-6 rounded-xl font-serif text-xl flex justify-center items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md">
          <span>生成环境分析报告</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </motion.div>
  );
}
