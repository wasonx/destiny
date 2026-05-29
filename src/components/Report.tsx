import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Download, MessageSquare, RefreshCw, Sparkles } from 'lucide-react';
import { buildFallbackReport, InsightReport } from '../lib/insights';

interface ReportProps {
  report?: InsightReport | null;
  loading?: boolean;
}

export default function Report({ report, loading = false }: ReportProps) {
  const activeReport = report ?? buildFallbackReport('life');
  const categories = ['总览', ...activeReport.sections.map((section) => section.title.replace(/提醒|判断/g, '').slice(0, 4))];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full border border-wisdom-gold/30 border-t-wisdom-gold"
        />
        <div>
          <h2 className="font-serif text-2xl text-ink-blue mb-3">正在生成报告</h2>
          <p className="text-on-surface-variant text-sm">AI 正在整理结构化分析，请稍候。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <nav className="fixed top-16 left-0 w-full z-40 bg-paper-white/95 backdrop-blur-md border-b border-shadow-gray overflow-x-auto hide-scrollbar">
        <div className="max-w-report-width-max mx-auto px-margin-mobile flex gap-6 py-3 min-w-max">
          {categories.map((cat, i) => (
            <button
              key={`${cat}-${i}`}
              className={`text-sm font-medium transition-colors ${i === 0 ? 'text-ink-blue border-b-2 border-ink-blue pb-1' : 'text-on-surface-variant hover:text-ink-blue'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      <section className="pt-8 space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3 border-b border-shadow-gray pb-4">
          <div>
            <h2 className="font-serif text-3xl text-ink-blue mb-2">{activeReport.title}</h2>
            <p className="text-on-surface-variant text-sm">{activeReport.subtitle}</p>
          </div>
          <div className="md:text-right">
            <p className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">生成于 {activeReport.generatedAt}</p>
            {activeReport.source === 'fallback' && (
              <p className="text-[11px] text-wisdom-gold mt-1">离线示例结果</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-report-bg border border-shadow-gray rounded-xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-serene-teal/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-wisdom-gold" />
          <h3 className="font-serif text-xl text-ink-blue">核心摘要</h3>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          {activeReport.keywords.map((tag) => (
            <span key={tag} className="px-4 py-1.5 bg-white border border-shadow-gray rounded-full font-mono text-xs text-ink-blue">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-on-surface-variant leading-relaxed">{activeReport.summary}</p>
      </section>

      {activeReport.sections.map((section, index) => (
        <section key={section.title} className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-px bg-shadow-gray flex-1" />
            <h3 className="font-serif text-2xl text-ink-blue px-4 whitespace-nowrap">{section.title}</h3>
            <div className="h-px bg-shadow-gray flex-1" />
          </div>

          <div className="bg-white border border-shadow-gray rounded-xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-serene-teal" />
            <div className="space-y-6">
              <p className="text-on-surface-variant leading-relaxed">{section.content}</p>
              {section.points?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {section.points.map((point) => (
                    <div key={point} className="bg-report-bg p-4 rounded-lg border border-shadow-gray/50">
                      <div className="flex items-center gap-2 mb-2">
                        {index % 2 === 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-wisdom-gold" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-serene-teal" />
                        )}
                        <span className="font-mono text-xs text-ink-blue font-bold uppercase tracking-wider">要点</span>
                      </div>
                      <p className="text-on-surface-variant text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ))}

      <section className="bg-white border border-shadow-gray rounded-xl p-6 md:p-8 mb-24">
        <h3 className="font-serif text-xl text-ink-blue mb-5">接下来可以优先做的事</h3>
        <div className="space-y-4">
          {activeReport.actions.map((item, i) => (
            <div key={item} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-serene-teal/10 text-serene-teal font-mono text-[10px] shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="block text-on-surface-variant text-sm leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-outline opacity-70 mt-6">{activeReport.disclaimer}</p>
      </section>

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
