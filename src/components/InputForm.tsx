import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Calendar, Clock, Lock, MapPin } from 'lucide-react';

interface LifeFormData {
  birthdate: string;
  birthtime: string;
  birthplace: string;
  gender: string;
  concern: string;
  tier?: 'free' | 'full';
}

interface InputFormProps {
  onSubmit: (data: LifeFormData) => void;
}

const concerns = ['整体', '感情', '事业', '财富', '学业', '家庭', '身心'];

export default function InputForm({ onSubmit }: InputFormProps) {
  const [gender, setGender] = useState('male');
  const [concern, setConcern] = useState('整体');
  const [reportTier, setReportTier] = useState<'free' | 'full'>('free');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-paper-white"
    >
      <div className="mb-10 text-center">
        <p className="text-on-surface-variant text-base md:text-lg tracking-wide leading-relaxed">
          输入您的基础信息，<br />开启甄算个人节奏参考。
        </p>
        <div className="w-12 h-[2px] bg-wisdom-gold mx-auto mt-6 rounded-full opacity-60" />
      </div>

      <form
        className="space-y-8 flex-grow"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          onSubmit({
            birthdate: String(form.get('birthdate') || ''),
            birthtime: String(form.get('birthtime') || ''),
            birthplace: String(form.get('birthplace') || ''),
            gender,
            concern,
            tier: reportTier,
          });
        }}
      >
        <div className="group">
          <label className="block font-mono text-[10px] text-on-surface-variant mb-2 ml-1 uppercase tracking-wider" htmlFor="birthdate">出生日期</label>
          <div className="relative">
            <input
              type="date"
              id="birthdate"
              name="birthdate"
              required
              className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 px-1 focus:ring-0 focus:border-ink-blue transition-colors cursor-pointer appearance-none"
            />
            <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-shadow-gray group-focus-within:text-ink-blue transition-colors pointer-events-none" />
          </div>
        </div>

        <div className="group">
          <div className="flex justify-between items-baseline mb-2 ml-1">
            <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-wider" htmlFor="birthtime">出生时间</label>
            <span className="text-[10px] text-outline opacity-70">如不确定可选择大致时段</span>
          </div>
          <div className="relative">
            <input
              type="time"
              id="birthtime"
              name="birthtime"
              className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 px-1 focus:ring-0 focus:border-ink-blue transition-colors cursor-pointer appearance-none"
            />
            <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-shadow-gray group-focus-within:text-ink-blue transition-colors pointer-events-none" />
          </div>
        </div>

        <div className="group">
          <label className="block font-mono text-[10px] text-on-surface-variant mb-2 ml-1 uppercase tracking-wider" htmlFor="birthplace">出生地点</label>
          <div className="relative">
            <input
              type="text"
              id="birthplace"
              name="birthplace"
              placeholder="城市/地区"
              required
              className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 px-1 focus:ring-0 focus:border-ink-blue transition-colors placeholder-shadow-gray/50"
            />
            <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-shadow-gray group-focus-within:text-ink-blue transition-colors pointer-events-none" />
          </div>
        </div>

        <div className="pt-2">
          <label className="block font-mono text-[10px] text-on-surface-variant mb-4 ml-1 uppercase tracking-wider">当前关注方向</label>
          <div className="flex flex-wrap gap-2">
            {concerns.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setConcern(item)}
                className={`px-4 py-2 rounded-full border text-sm transition-colors ${concern === item ? 'border-serene-teal bg-serene-teal text-white' : 'border-shadow-gray text-ink-blue hover:bg-surface'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <label className="block font-mono text-[10px] text-on-surface-variant mb-4 ml-1 uppercase tracking-wider">性别</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`flex-1 py-4 border rounded-xl text-center transition-all ${gender === 'male' ? 'border-ink-blue bg-ink-blue text-white shadow-md' : 'border-shadow-gray text-on-surface-variant hover:bg-surface'}`}
            >
              <span className="font-serif text-xl block mb-1">乾</span>
              <span className="font-mono text-[10px] opacity-80 uppercase">男</span>
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`flex-1 py-4 border rounded-xl text-center transition-all ${gender === 'female' ? 'border-ink-blue bg-ink-blue text-white shadow-md' : 'border-shadow-gray text-on-surface-variant hover:bg-surface'}`}
            >
              <span className="font-serif text-xl block mb-1">坤</span>
              <span className="font-mono text-[10px] opacity-80 uppercase">女</span>
            </button>
          </div>
        </div>

        <div className="pt-4">
          <label className="block font-mono text-[10px] text-on-surface-variant mb-4 ml-1 uppercase tracking-wider">报告版本</label>
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

        <div className="mt-12 flex items-start gap-2 justify-center opacity-50">
          <Lock className="w-4 h-4 text-on-surface-variant mt-0.5" />
          <p className="text-xs text-on-surface-variant text-center">
            您的隐私信息仅用于生成报告，可随时删除。
          </p>
        </div>

        <div className="pt-12 pb-32 md:pb-8">
          <button
            type="submit"
            className="w-full bg-ink-blue text-white py-4 px-6 rounded-xl font-serif text-xl flex justify-center items-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all shadow-md"
          >
            <span>生成个人参考报告</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
