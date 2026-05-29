import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Compass, Users, Hourglass, Home as HomeIcon } from 'lucide-react';

interface HomeProps {
  onNavigate: (view: string) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const entries = [
    {
      id: 'zhaojian',
      title: '照见',
      subtitle: '人生全景',
      description: '通过生辰排盘，深度解析您的先天禀赋、性格特质与人生轨迹。如对镜自照，明心见性。',
      icon: <Compass className="w-6 h-6 text-serene-teal" />,
      color: 'bg-serene-teal',
      view: 'input'
    },
    {
      id: 'heyuan',
      title: '合缘',
      subtitle: '关系结构',
      description: '分析两个人的吸引点、冲突点与相处节奏，帮助关系回到更清晰的沟通。',
      icon: <Users className="w-6 h-6 text-vital-vermillion" />,
      color: 'bg-vital-vermillion',
      view: 'relationship'
    },
    {
      id: 'wenshi',
      title: '问时',
      subtitle: '即时解答',
      description: '围绕一个当下困惑生成即时分析，提醒你先观察、再行动，不鼓励频繁重复提问。',
      icon: <Hourglass className="w-6 h-6 text-wisdom-gold" />,
      color: 'bg-wisdom-gold',
      view: 'questions'
    },
    {
      id: 'anju',
      title: '安居',
      subtitle: '环境分析',
      description: '结合户型、朝向和环境照片，提供居家或办公空间的低成本调整建议。',
      icon: <HomeIcon className="w-6 h-6 text-serene-teal" />,
      color: 'bg-serene-teal',
      view: 'anju'
    }
  ];

  return (
    <div className="flex flex-col gap-section-gap py-4">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center mt-4 mb-2"
      >
        <p className="font-mono text-xs text-wisdom-gold mb-3 uppercase tracking-widest">Digital Zen</p>
        <h2 className="font-serif text-2xl md:text-3xl text-ink-blue mb-4">看见人生节奏，理解当下选择</h2>
        <p className="text-secondary-fixed-dim text-sm md:text-base max-w-md mx-auto mb-8">
          基于东方传统文化与 AI 生成个人、关系、问事与空间环境报告
        </p>
        <button 
          onClick={() => onNavigate('input')}
          className="bg-serene-teal hover:bg-serene-teal/90 text-white font-medium px-8 py-3 rounded-lg transition-colors active:scale-95 flex items-center gap-2 shadow-sm"
        >
          <span>开始生成报告</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {entries.map((entry, idx) => (
          <motion.button
            key={entry.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onNavigate(entry.view)}
            className="group relative text-left bg-white rounded-lg border border-shadow-gray overflow-hidden hover:shadow-md transition-all duration-300 active:scale-[0.98]"
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${entry.color}`}></div>
            <div className="p-6 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface">
                    {entry.icon}
                  </div>
                  <span className={`font-mono text-[10px] text-white px-3 py-1 ${entry.color} rounded-full uppercase tracking-tighter`}>
                    {entry.subtitle}
                  </span>
                </div>
              </div>
              <h3 className="font-serif text-xl md:text-2xl text-ink-blue mb-2">{entry.title}</h3>
              <p className="text-on-surface-variant text-sm md:text-base mb-6 flex-grow leading-relaxed">
                {entry.description}
              </p>
              <div className="mt-auto flex items-center text-ink-blue font-medium group-hover:text-serene-teal transition-colors">
                开启探索 <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="text-center mt-4">
        <p className="text-xs text-outline opacity-60">内容仅作自我探索与生活参考</p>
      </div>
    </div>
  );
}
