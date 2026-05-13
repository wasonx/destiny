/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Home from './components/Home';
import InputForm from './components/InputForm';
import Report from './components/Report';
import Relationship from './components/Relationship';
import Questions from './components/Questions';

type ViewType = 'home' | 'input' | 'report' | 'relationship' | 'questions' | 'anju';

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [reportsView, setReportsView] = useState(false);

  const handleNavigate = (newView: string) => {
    setView(newView as ViewType);
    setReportsView(false);
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'home') {
      setView('home');
      setReportsView(false);
    } else if (tab === 'reports') {
      setReportsView(true);
    }
  };

  const renderContent = () => {
    if (reportsView) {
      return <Report />;
    }

    switch (view) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'input':
        return <InputForm onSubmit={() => setView('report')} />;
      case 'report':
        return <Report />;
      case 'relationship':
        return <Relationship />;
      case 'questions':
        return <Questions />;
      case 'anju':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-serif text-2xl text-ink-blue mb-4">安居 · 环境分析</h2>
            <p className="text-on-surface-variant max-w-sm">正在开发中，敬请期待...</p>
            <button 
              onClick={() => setView('home')}
              className="mt-8 text-serene-teal font-medium flex items-center gap-2"
            >
              返回首页
            </button>
          </div>
        );
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  const getTitle = () => {
    if (reportsView) return "人生全景报告";
    switch (view) {
      case 'input': return "照见 · 信息录入";
      case 'report': return "照见 · 人生全景";
      case 'relationship': return "合缘 · 双人关系";
      case 'questions': return "问时 · 一事一解";
      case 'anju': return "安居 · 环境分析";
      default: return "元启东方";
    }
  };

  return (
    <Layout 
      activeTab={reportsView ? 'reports' : (view === 'home' || view === 'input' ? 'home' : 'profile')} 
      onTabChange={handleTabChange}
      title={getTitle()}
      showBack={view !== 'home' || reportsView}
      onBack={() => {
        if (reportsView) setReportsView(false);
        else setView('home');
      }}
    >
      {renderContent()}
    </Layout>
  );
}
