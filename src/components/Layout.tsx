import React from 'react';
import { Menu, Bell, Compass, FileText, User } from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  hideBottomNav?: boolean;
}

export default function Layout({ 
  children, 
  activeTab, 
  onTabChange, 
  title = "甄算",
  showBack = false,
  onBack,
  hideBottomNav = false
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative selection:bg-wisdom-gold/30 selection:text-ink-blue">
      {/* Ambient Background */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[url('https://images.unsplash.com/photo-1577083165350-14e4c5b16955?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-multiply rounded-bl-full"></div>
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-to-tr from-serene-teal/5 to-transparent rounded-tr-full"></div>
      </div>

      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-shadow-gray flex justify-between items-center px-margin-mobile h-16">
        {showBack ? (
          <button 
            onClick={onBack}
            className="text-ink-blue hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center p-2 -ml-2 rounded-full"
          >
            <motion.div whileHover={{ x: -2 }}>
              <Compass className="w-6 h-6 rotate-180" />
            </motion.div>
          </button>
        ) : (
          <button className="text-ink-blue hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center p-2 -ml-2 rounded-full">
            <Menu className="w-6 h-6" />
          </button>
        )}
        
        <h1 className="font-serif text-xl md:text-2xl text-ink-blue font-bold tracking-tight">{title}</h1>
        
        <button className="text-ink-blue hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center p-2 -mr-2 rounded-full">
          <Bell className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className={`flex-grow relative z-10 pt-20 ${hideBottomNav ? 'pb-8' : 'pb-24 md:pb-8'} w-full max-w-report-width-max mx-auto px-margin-mobile md:px-margin-desktop`}>
        {children}
      </main>

      {/* Bottom Nav */}
      {!hideBottomNav && <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-t border-shadow-gray flex justify-around items-center h-20 px-4 pb-safe">
        <button 
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center px-4 py-1 transition-all duration-200 ${activeTab === 'home' || activeTab === 'input' ? 'text-ink-blue bg-wisdom-gold/10 rounded-lg' : 'text-on-surface-variant'}`}
        >
          <Compass className={`w-6 h-6 ${activeTab === 'home' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-mono mt-1 uppercase tracking-tighter">照见</span>
        </button>
        
        <button 
          onClick={() => onTabChange('reports')}
          className={`flex flex-col items-center justify-center px-4 py-1 transition-all duration-200 ${activeTab === 'reports' ? 'text-ink-blue bg-wisdom-gold/10 rounded-lg' : 'text-on-surface-variant'}`}
        >
          <FileText className="w-6 h-6" />
          <span className="text-[10px] font-mono mt-1 uppercase tracking-tighter">报告</span>
        </button>
        
        <button 
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center px-4 py-1 transition-all duration-200 ${activeTab === 'profile' ? 'text-ink-blue bg-wisdom-gold/10 rounded-lg' : 'text-on-surface-variant'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-mono mt-1 uppercase tracking-tighter">我</span>
        </button>
      </nav>}
    </div>
  );
}
