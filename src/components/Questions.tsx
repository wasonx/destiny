import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Clock, Info } from 'lucide-react';
import Report from './Report';
import { generateInsight, InsightReport } from '../lib/insights';

const categories = ['感情', '事业', '财富', '学业', '家庭', '合作', '搬家'];
const historyKey = 'destiny-question-history';
const fourteenDays = 14 * 24 * 60 * 60 * 1000;

interface QuestionHistory {
  category: string;
  question: string;
  createdAt: number;
}

function readHistory(): QuestionHistory[] {
  try {
    const raw = localStorage.getItem(historyKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQuestion(item: QuestionHistory) {
  const next = [item, ...readHistory()].slice(0, 20);
  localStorage.setItem(historyKey, JSON.stringify(next));
}

function getCurrentHourName() {
  const hour = new Date().getHours();
  const names = ['子时', '丑时', '丑时', '寅时', '寅时', '卯时', '卯时', '辰时', '辰时', '巳时', '巳时', '午时', '午时', '未时', '未时', '申时', '申时', '酉时', '酉时', '戌时', '戌时', '亥时', '亥时', '子时'];
  return names[hour] ?? '当前时辰';
}

export default function Questions() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('感情');
  const [reportTier, setReportTier] = useState<'free' | 'full'>('free');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<InsightReport | null>(null);
  const currentTime = useMemo(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }, []);
  const currentHourName = useMemo(getCurrentHourName, []);
  const recentSimilar = useMemo(
    () => readHistory().find((item) => item.category === category && Date.now() - item.createdAt < fourteenDays),
    [category],
  );

  if (loading || report) {
    return <Report loading={loading} report={report} />;
  }

  return (
    <div className="flex flex-col items-center justify-start gap-8 py-4 animate-in fade-in duration-700">
      <section className="w-full flex flex-col items-center bg-white/60 backdrop-blur-sm border border-shadow-gray shadow-sm rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <Clock className="w-32 h-32" />
        </div>
        <div className="flex items-center gap-4 z-10">
          <div className="text-center">
            <p className="font-mono text-[10px] text-on-surface-variant mb-1 uppercase tracking-wider">当前提问时间</p>
            <div className="flex items-baseline gap-2 text-ink-blue">
              <span className="font-serif text-2xl">今日 {currentTime}</span>
              <span className="font-sans text-lg text-wisdom-gold font-medium">{currentHourName}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 bg-surface/50 border border-shadow-gray/30 px-4 py-2 rounded-lg z-10 w-full max-w-sm">
          <Info className="w-4 h-4 text-on-surface-variant mt-0.5" />
          <p className="text-xs text-on-surface-variant">本次分析将以你提交问题的时间为参考。</p>
        </div>
      </section>

      <form
        className="w-full flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!question.trim()) return;
          setLoading(true);
          saveQuestion({ category, question: question.trim(), createdAt: Date.now() });
          const nextReport = await generateInsight({
            kind: 'question',
            payload: { category, question, askedAt: new Date().toISOString(), hourName: currentHourName },
            tier: reportTier,
          });
          setReport(nextReport);
          setLoading(false);
        }}
      >
        <section className="bg-white/60 backdrop-blur-xl border border-shadow-gray shadow-sm rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden">
          <div className="w-full">
            <p className="font-mono text-[10px] text-on-surface-variant mb-3 uppercase tracking-wider">问题方向</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`px-4 py-1.5 rounded-full border text-sm transition-colors ${category === item ? 'border-serene-teal bg-serene-teal text-white' : 'border-shadow-gray text-ink-blue hover:bg-surface-tint/5'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full flex flex-col gap-2">
            <label className="font-serif text-xl text-ink-blue font-semibold" htmlFor="question-input">
              你想问什么？
            </label>
            <textarea
              id="question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="请尽量只问一件具体的事，例如：这个合作机会是否值得继续推进？"
              rows={4}
              className="w-full bg-white border border-shadow-gray rounded-xl focus:border-ink-blue focus:ring-1 focus:ring-ink-blue p-4 text-ink-blue placeholder:text-on-surface-variant/40 mt-2 resize-none"
            />
          </div>

          {recentSimilar && (
            <div className="flex items-start gap-2 bg-wisdom-gold/10 border border-wisdom-gold/30 px-4 py-3 rounded-xl">
              <AlertCircle className="w-5 h-5 text-wisdom-gold shrink-0 mt-0.5" />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                你在 14 天内问过「{recentSimilar.category}」相关问题。若事情没有新变化，建议先查看上次结果，避免对同一件事频繁提问。
              </p>
            </div>
          )}

          <div>
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
          </div>

          <button className="bg-ink-blue text-white font-mono text-sm px-8 py-3 rounded-full hover:bg-ink-blue/90 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 w-full md:w-auto">
            <span>提交并生成分析</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        <div className="flex items-start gap-2 bg-white/40 border border-shadow-gray px-4 py-3 rounded-xl">
          <AlertCircle className="w-5 h-5 text-wisdom-gold shrink-0 mt-0.5" />
          <p className="text-xs text-on-surface-variant leading-relaxed">
            同一件事不宜频繁问。建议在事情出现新变化，或间隔 1-2 周后再问。
          </p>
        </div>
      </form>
    </div>
  );
}
