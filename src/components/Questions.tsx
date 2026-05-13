import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Info, ArrowRight, AlertCircle } from 'lucide-react';

export default function Questions() {
  const [question, setQuestion] = useState('');
  const categories = ['感情', '事业', '财富', '学业', '家庭', '合作', '搬家'];

  return (
    <div className="flex flex-col items-center justify-start gap-8 py-4 animate-in fade-in duration-700">
      {/* Time Module */}
      <section className="w-full flex flex-col items-center bg-white/60 backdrop-blur-sm border border-shadow-gray shadow-sm rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <Clock className="w-32 h-32" />
        </div>
        <div className="flex items-center gap-4 z-10">
          <div className="text-center">
            <p className="font-mono text-[10px] text-on-surface-variant mb-1 uppercase tracking-wider">当前起卦时间</p>
            <div className="flex items-baseline gap-2 text-ink-blue">
              <span className="font-serif text-2xl">今日 14:36</span>
              <span className="font-sans text-lg text-wisdom-gold font-medium">未时</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 bg-surface/50 border border-shadow-gray/30 px-4 py-2 rounded-lg z-10 w-full max-w-sm">
          <Info className="w-4 h-4 text-on-surface-variant mt-0.5" />
          <p className="text-xs text-on-surface-variant">本次分析将以你提交问题的时间为参考.</p>
        </div>
      </section>

      {/* Question Form */}
      <section className="w-full flex flex-col gap-4">
        <div className="bg-white/60 backdrop-blur-xl border border-shadow-gray shadow-sm rounded-2xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden">
          <div className="w-full flex flex-col gap-2">
            <label className="font-serif text-xl text-ink-blue font-semibold" htmlFor="question-input">
              你想问什么？
            </label>
            <textarea 
              id="question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="请尽量只问一件具体的事..."
              rows={4}
              className="w-full bg-white border border-shadow-gray rounded-xl focus:border-ink-blue focus:ring-1 focus:ring-ink-blue p-4 text-ink-blue placeholder:text-on-surface-variant/40 mt-2 resize-none"
            />
          </div>

          <div className="w-full">
            <p className="font-mono text-[10px] text-on-surface-variant mb-3 uppercase tracking-wider">或选择常见方向：</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setQuestion(`我想问关于${cat}的事情...`)}
                  className="px-4 py-1.5 rounded-full border border-shadow-gray text-ink-blue text-sm hover:bg-surface-tint/5 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-shadow-gray/30 pt-6 mt-2">
            <button className="bg-ink-blue text-white font-mono text-sm px-8 py-3 rounded-full hover:bg-ink-blue/90 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 w-full md:w-auto">
              <span>提交问题</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 bg-white/40 border border-shadow-gray px-4 py-3 rounded-xl">
          <AlertCircle className="w-5 h-5 text-wisdom-gold shrink-0 mt-0.5" />
          <p className="text-xs text-on-surface-variant leading-relaxed">
            同一件事不宜频繁问。建议在事情出现新变化，或间隔 1-2 周后再问。
          </p>
        </div>
      </section>
    </div>
  );
}
