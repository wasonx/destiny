import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, BarChart3, CheckCircle2, AlertCircle, Download, MessageSquare, RefreshCw, Share2 } from 'lucide-react';

export default function Report() {
  const categories = ['总览', '性格', '事业', '财富', '感情', '家庭', '身心', '年度'];
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Sticky Chapter Nav */}
      <nav className="fixed top-16 left-0 w-full z-40 bg-paper-white/95 backdrop-blur-md border-b border-shadow-gray overflow-x-auto hide-scrollbar">
        <div className="max-w-report-width-max mx-auto px-margin-mobile flex gap-6 py-3 min-w-max">
          {categories.map((cat, i) => (
            <button 
              key={cat}
              className={`text-sm font-medium transition-colors ${i === 0 ? 'text-ink-blue border-b-2 border-ink-blue pb-1' : 'text-on-surface-variant hover:text-ink-blue'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      {/* Header Section */}
      <section className="pt-8 space-y-4">
        <div className="flex justify-between items-end border-b border-shadow-gray pb-4">
          <div>
            <h2 className="font-serif text-3xl text-ink-blue mb-2">人生全景测算报告</h2>
            <p className="text-on-surface-variant text-sm">为您的生命轨迹提供深度洞察</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">生成于 2026.05.13</p>
          </div>
        </div>
      </section>

      {/* Summary Card */}
      <section className="bg-report-bg border border-shadow-gray rounded-xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-serene-teal/10 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-wisdom-gold" />
          <h3 className="font-serif text-xl text-ink-blue">核心特质总结</h3>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          {['行动力', '责任感', '晚成型'].map(tag => (
            <span key={tag} className="px-4 py-1.5 bg-white border border-shadow-gray rounded-full font-mono text-xs text-ink-blue">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-on-surface-variant leading-relaxed">
          您拥有极强的执行力和对目标的执着追求，具备在复杂环境中承压前行的韧性。早年可能经历较多磨砺与探索，但这些积淀将成为您厚积薄发的基石。在事业与人生的长跑中，您属于典型的“大器晚成”格局，时间会证明您的价值与选择。
        </p>
      </section>

      {/* Career Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-px bg-shadow-gray flex-1"></div>
          <h3 className="font-serif text-2xl text-ink-blue px-4 whitespace-nowrap">事业节奏</h3>
          <div className="h-px bg-shadow-gray flex-1"></div>
        </div>

        <div className="bg-white border border-shadow-gray rounded-xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-serene-teal"></div>
          <div className="space-y-8">
            <div>
              <h4 className="font-serif text-lg text-ink-blue mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-serene-teal" />
                运势洞察
              </h4>
              <p className="text-on-surface-variant leading-relaxed">
                当前处于事业的蓄力期与关键转折点。虽然外在环境充满变数，但您的核心竞争力并未受损。此时不宜盲目扩张或频繁转换赛道，而应专注于深耕既有优势领域，稳固核心资源。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-report-bg p-4 rounded-lg border border-shadow-gray/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-wisdom-gold" />
                  <span className="font-mono text-xs text-ink-blue font-bold uppercase tracking-wider">优势点</span>
                </div>
                <p className="text-on-surface-variant text-sm">专注度高，执行力强，能够在压力下保持冷静，完成既定目标。</p>
              </div>
              <div className="bg-report-bg p-4 rounded-lg border border-shadow-gray/50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-vital-vermillion" />
                  <span className="font-mono text-xs text-ink-blue font-bold uppercase tracking-wider">需注意</span>
                </div>
                <p className="text-on-surface-variant text-sm">可能因过于追求完美而导致进度延宕，或在团队沟通中显得过于生硬。</p>
              </div>
            </div>

            <div className="pt-6 border-t border-shadow-gray">
              <h4 className="font-serif text-lg text-ink-blue mb-4">行动建议</h4>
              <div className="space-y-4">
                {[
                  { title: '稳定核心资源', desc: '维护现有的关键人脉与业务基本盘，避免在未经充分评估的情况下投入高风险的新项目。' },
                  { title: '减少频繁切换', desc: '在职业轨道上保持定力，避免因短期焦虑而频繁跳槽或改变发展方向。' },
                  { title: '选择长期合作', desc: '寻找价值观契合、能够互补短板的长期合作伙伴，共同分担风险，共享收益。' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-serene-teal/10 text-serene-teal font-mono text-[10px] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <span className="block font-medium text-ink-blue mb-1">{item.title}</span>
                      <span className="block text-on-surface-variant text-sm">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Buttons or Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-paper-white/95 backdrop-blur-md border-t border-shadow-gray pb-safe">
        <div className="max-w-report-width-max mx-auto px-margin-mobile py-3 flex items-center justify-between gap-3">
          <button className="flex-1 py-3 px-4 border border-shadow-gray rounded-lg text-sm text-ink-blue hover:bg-surface transition-colors flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">下载 PDF</span>
          </button>
          <button className="flex-1 py-3 px-4 bg-ink-blue text-white rounded-lg text-sm hover:opacity-90 transition-opacity active:scale-95 shadow-sm flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>继续追问</span>
          </button>
          <button className="flex-1 py-3 px-4 border border-shadow-gray rounded-lg text-sm text-ink-blue hover:bg-surface transition-colors flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">年度更新</span>
          </button>
        </div>
      </div>
    </div>
  );
}
