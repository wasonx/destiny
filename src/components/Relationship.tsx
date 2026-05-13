import React from 'react';
import { motion } from 'motion/react';
import { Infinity, ArrowRightLeft, Brain, Scale, Calendar, MessageSquare, Sparkles, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

export default function Relationship() {
  return (
    <div className="space-y-section-gap pb-32 animate-in slide-in-from-bottom-5 duration-700">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center space-y-8">
        <div className="space-y-2">
          <h2 className="font-serif text-3xl md:text-4xl text-ink-blue">合缘 · 双人关系</h2>
          <p className="text-on-surface-variant text-sm md:text-base max-w-lg mx-auto">
            透析你们的相遇逻辑，发现彼此生命轨道中的交叠与互补。
          </p>
        </div>

        {/* Interaction Graphic */}
        <div className="relative w-full max-w-md aspect-square mx-auto flex items-center justify-center my-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-shadow-gray/20 to-paper-white/50 opacity-50 blur-3xl"></div>
          
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute left-[10%] w-3/5 aspect-square rounded-full bg-serene-teal/5 border border-serene-teal/20 flex flex-col items-center justify-center backdrop-blur-md z-10 hover:z-30 transition-all duration-500 hover:scale-105 group shadow-sm"
          >
            <span className="font-serif text-xl text-ink-blue group-hover:font-bold">木兰</span>
            <span className="font-mono text-[10px] text-on-surface-variant mt-1 uppercase tracking-tighter">阳木 · 生发</span>
          </motion.div>

          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute right-[10%] w-3/5 aspect-square rounded-full bg-wisdom-gold/5 border border-wisdom-gold/20 flex flex-col items-center justify-center backdrop-blur-md z-20 hover:z-30 transition-all duration-500 hover:scale-105 group shadow-sm"
          >
            <span className="font-serif text-xl text-ink-blue group-hover:font-bold">长风</span>
            <span className="font-mono text-[10px] text-on-surface-variant mt-1 uppercase tracking-tighter">阴金 · 肃敛</span>
          </motion.div>

          <div className="absolute w-24 h-24 rounded-full bg-white shadow-[0_0_40px_rgba(26,47,75,0.08)] flex items-center justify-center z-30 flex-col border border-shadow-gray">
            <Infinity className="text-serene-teal w-8 h-8" />
            <span className="font-mono text-[10px] text-ink-blue mt-1 uppercase tracking-tighter">金木交融</span>
          </div>
        </div>

        {/* Summary Badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <span className="px-4 py-1.5 rounded-full border border-serene-teal/30 text-serene-teal font-mono text-[10px] bg-serene-teal/5 uppercase">互补度 85%</span>
          <span className="px-4 py-1.5 rounded-full border border-wisdom-gold/30 text-wisdom-gold font-mono text-[10px] bg-wisdom-gold/5 uppercase">默契度 92%</span>
          <span className="px-4 py-1.5 rounded-full border border-vital-vermillion/30 text-vital-vermillion font-mono text-[10px] bg-vital-vermillion/5 uppercase">冲突点 1处</span>
        </div>
      </section>

      {/* Trait Comparison */}
      <section className="space-y-6">
        <h3 className="font-serif text-xl text-ink-blue border-b border-shadow-gray pb-2 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-serene-teal" />
          特质镜像对比
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {/* Person A */}
          <div className="bg-white border-l-4 border-l-serene-teal border-y border-r border-shadow-gray rounded-r-xl p-6 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-serif text-lg text-ink-blue">木兰</h4>
              <Brain className="w-5 h-5 text-serene-teal opacity-50" />
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-serene-teal mt-0.5">+</span>
                <div>
                  <strong className="block text-ink-blue">开创型驱动</strong>
                  <span className="text-on-surface-variant">富有远见，擅长打破常规建立新秩序。</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-vital-vermillion mt-0.5">-</span>
                <div>
                  <strong className="block text-ink-blue">耐心易耗损</strong>
                  <span className="text-on-surface-variant">在繁琐细节前容易感到焦躁。</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Person B */}
          <div className="bg-white border-l-4 border-l-wisdom-gold border-y border-r border-shadow-gray rounded-r-xl p-6 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-serif text-lg text-ink-blue">长风</h4>
              <Scale className="w-5 h-5 text-wisdom-gold opacity-50" />
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-wisdom-gold mt-0.5">+</span>
                <div>
                  <strong className="block text-ink-blue">稳健型守成</strong>
                  <span className="text-on-surface-variant">逻辑严密，善于在既有框架内优化。</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-vital-vermillion mt-0.5">-</span>
                <div>
                  <strong className="block text-ink-blue">适应性较慢</strong>
                  <span className="text-on-surface-variant">面对突发剧变时需要较长消化期。</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Reminder */}
      <section className="space-y-4">
        <h3 className="font-serif text-xl text-ink-blue flex items-center gap-2">
          <Calendar className="w-5 h-5 text-serene-teal" />
          年度关系提醒
        </h3>
        <div className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-serene-teal/5 rounded-bl-full"></div>
          <p className="text-on-surface-variant relative z-10 leading-relaxed text-sm md:text-base">
            今年对于木兰与长风的组合，是<strong className="text-ink-blue font-semibold">磨合与升华并存</strong>的一年。特别在第三季度，工作与生活节奏的错位可能会带来挑战。建议增加共处时光，寻找共同的兴趣点，例如一起参加文化活动或短途旅行。
          </p>
        </div>
      </section>

      {/* Advice */}
      <section className="space-y-6">
        <h3 className="font-serif text-xl text-ink-blue flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-serene-teal" />
          相处之道与沟通建议
        </h3>
        <div className="space-y-6">
          <div className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-serene-teal/10">
                <Sparkles className="w-5 h-5 text-serene-teal" />
              </div>
              <h4 className="font-bold text-ink-blue">核心引力场</h4>
            </div>
            <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">
              木兰的「生发之力」能有效破除长风的沉闷，带来新鲜感；而长风的「肃敛之气」则能为木兰的冲动提供必要的刹车与保护。你们在「创新与落地」之间形成了完美的闭环。
            </p>
            <div className="bg-report-bg rounded-lg p-4 border border-shadow-gray/50 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-serene-teal shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>相处建议：</strong>共同推进一个需要分工协作的项目（如装修、旅行规划），让彼此看到对方在不同环节的不可替代性。
              </div>
            </div>
          </div>

          <div className="bg-white border border-shadow-gray rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-vital-vermillion/10">
                <AlertTriangle className="w-5 h-5 text-vital-vermillion" />
              </div>
              <h4 className="font-bold text-ink-blue">潜在冲突点：决策节奏</h4>
            </div>
            <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">
              当面临重大选择时，木兰倾向于「凭直觉快刀斩乱麻」，而长风需要「收集所有数据后才表态」。这种时间差容易让前者觉得后者拖沓，后者觉得前者草率。
            </p>
            <div className="bg-report-bg rounded-lg p-4 border border-shadow-gray/50 flex items-start gap-3">
              <Clock className="w-5 h-5 text-wisdom-gold shrink-0 mt-0.5" />
              <div className="text-sm text-on-surface">
                <strong>化解方案：</strong>设立「缓冲期规则」。对于非紧急重大决定，强制设定24小时的冷静期，期间双方各自思考，不强求立即答复。
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex justify-center pt-8">
        <button className="bg-ink-blue text-white font-medium px-8 py-4 rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 border border-ink-blue/20">
          <Sparkles className="w-5 h-5" />
          <span>生成专属合盘详批</span>
        </button>
      </section>
    </div>
  );
}
