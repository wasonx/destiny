import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Lock, ArrowRight } from 'lucide-react';

interface InputFormProps {
  onSubmit: (data: any) => void;
}

export default function InputForm({ onSubmit }: InputFormProps) {
  const [gender, setGender] = useState('male');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-paper-white"
    >
      <div className="mb-10 text-center">
        <p className="text-on-surface-variant text-base md:text-lg tracking-wide leading-relaxed">
          输入您的出生信息，<br/>开启 AI 东方人生全景探索。
        </p>
        <div className="w-12 h-[2px] bg-wisdom-gold mx-auto mt-6 rounded-full opacity-60"></div>
      </div>

      <form className="space-y-8 flex-grow" onSubmit={(e) => { e.preventDefault(); onSubmit({}); }}>
        {/* Date */}
        <div className="group">
          <label className="block font-mono text-[10px] text-on-surface-variant mb-2 ml-1 uppercase tracking-wider" htmlFor="birthdate">出生日期</label>
          <div className="relative">
            <input 
              type="date"
              id="birthdate"
              required
              className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 px-1 focus:ring-0 focus:border-ink-blue transition-colors cursor-pointer appearance-none" 
            />
            <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-shadow-gray group-focus-within:text-ink-blue transition-colors pointer-events-none" />
          </div>
        </div>

        {/* Time */}
        <div className="group">
          <div className="flex justify-between items-baseline mb-2 ml-1">
            <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-wider" htmlFor="birthtime">出生时间</label>
            <span className="text-[10px] text-outline opacity-70">如不确定可选择大致时段</span>
          </div>
          <div className="relative">
            <input 
              type="time" 
              id="birthtime"
              className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 px-1 focus:ring-0 focus:border-ink-blue transition-colors cursor-pointer appearance-none" 
            />
            <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-shadow-gray group-focus-within:text-ink-blue transition-colors pointer-events-none" />
          </div>
        </div>

        {/* Place */}
        <div className="group">
          <label className="block font-mono text-[10px] text-on-surface-variant mb-2 ml-1 uppercase tracking-wider" htmlFor="birthplace">出生地点</label>
          <div className="relative">
            <input 
              type="text" 
              id="birthplace"
              placeholder="城市/地区"
              className="w-full bg-transparent border-0 border-b border-shadow-gray text-ink-blue font-serif text-lg py-3 px-1 focus:ring-0 focus:border-ink-blue transition-colors placeholder-shadow-gray/50" 
            />
            <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-shadow-gray group-focus-within:text-ink-blue transition-colors pointer-events-none" />
          </div>
        </div>

        {/* Gender */}
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

        {/* Privacy Note */}
        <div className="mt-12 flex items-start gap-2 justify-center opacity-50">
          <Lock className="w-4 h-4 text-on-surface-variant mt-0.5" />
          <p className="text-xs text-on-surface-variant text-center">
            您的隐私信息仅用于生成报告，不作他用。
          </p>
        </div>

        {/* Action button (Absolute/Fixed at bottom in mobile, here we'll place it at bottom of form) */}
        <div className="pt-12 pb-8">
          <button 
            type="submit"
            className="w-full bg-ink-blue text-white py-4 px-6 rounded-xl font-serif text-xl flex justify-center items-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all shadow-md"
          >
            <span>生成人生全景报告</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
