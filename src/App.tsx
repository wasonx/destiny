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
import Anju from './components/Anju';
import { generateInsight, InsightReport } from './lib/insights';

type ViewType = 'home' | 'input' | 'report' | 'relationship' | 'questions' | 'anju';

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [reportsView, setReportsView] = useState(false);
  const [currentReport, setCurrentReport] = useState<InsightReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

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
      return <Report report={currentReport} />;
    }

    switch (view) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'input':
        return (
          <InputForm
            onSubmit={async (payload) => {
              setReportLoading(true);
              setView('report');
              const report = await generateInsight({ kind: 'life', payload: { ...payload } });
              setCurrentReport(report);
              setReportLoading(false);
            }}
          />
        );
      case 'report':
        return <Report report={currentReport} loading={reportLoading} />;
      case 'relationship':
        return <Relationship />;
      case 'questions':
        return <Questions />;
      case 'anju':
        return <Anju />;
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
      hideBottomNav={view !== 'home' || reportsView}
    >
      {renderContent()}
    </Layout>
  );
}
