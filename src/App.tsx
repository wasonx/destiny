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
import LoginPanel from './components/LoginPanel';
import ValueState from './components/ValueState';
import { generateInsight, InsightReport } from './lib/insights';
import { getCustomerToken } from './lib/customerAuth';

type ViewType = 'home' | 'input' | 'report' | 'relationship' | 'questions' | 'anju';

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [reportsView, setReportsView] = useState(false);
  const [currentReport, setCurrentReport] = useState<InsightReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [customerLoggedIn, setCustomerLoggedIn] = useState(Boolean(getCustomerToken()));

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
        return (
          <div className="space-y-6">
            {customerLoggedIn ? <ValueState /> : <LoginPanel onLoggedIn={() => setCustomerLoggedIn(true)} />}
            <Home onNavigate={handleNavigate} />
          </div>
        );
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
    if (reportsView) return "甄算 · 报告";
    switch (view) {
      case 'input': return "甄算 · 照见";
      case 'report': return "甄算 · 照见";
      case 'relationship': return "甄算 · 合缘";
      case 'questions': return "甄算 · 问时";
      case 'anju': return "甄算 · 安居";
      default: return "甄算";
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
