import React, { useMemo, useState } from 'react';
import { getAdminToken } from './api';
import AdminLayout, { AdminView } from './components/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import DeliveryLogsPage from './pages/DeliveryLogsPage';
import EntitlementsPage from './pages/EntitlementsPage';
import InventoryPage from './pages/InventoryPage';
import KnowledgePage from './pages/KnowledgePage';
import LoginPage from './pages/LoginPage';
import MembershipPage from './pages/MembershipPage';
import OntologyPage from './pages/OntologyPage';
import OpsPage from './pages/OpsPage';
import OrdersPage from './pages/OrdersPage';
import PaymentsPage from './pages/PaymentsPage';
import PointsPage from './pages/PointsPage';
import ProductsPage from './pages/ProductsPage';
import RefundsPage from './pages/RefundsPage';
import ReportRunsPage from './pages/ReportRunsPage';
import RulesPage from './pages/RulesPage';
import SettingsPage from './pages/SettingsPage';
import ShipmentsPage from './pages/ShipmentsPage';
import TemplatesPage from './pages/TemplatesPage';
import TestBenchPage from './pages/TestBenchPage';
import UsersPage from './pages/UsersPage';

export default function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getAdminToken()));
  const [view, setView] = useState<AdminView>('dashboard');

  const page = useMemo(() => {
    const pages: Record<AdminView, React.ReactNode> = {
      dashboard: <DashboardPage />,
      users: <UsersPage />,
      ontology: <OntologyPage />,
      knowledge: <KnowledgePage />,
      testbench: <TestBenchPage />,
      rules: <RulesPage />,
      templates: <TemplatesPage />,
      reports: <ReportRunsPage />,
      membership: <MembershipPage />,
      entitlements: <EntitlementsPage />,
      points: <PointsPage />,
      products: <ProductsPage />,
      inventory: <InventoryPage />,
      orders: <OrdersPage />,
      payments: <PaymentsPage />,
      shipments: <ShipmentsPage />,
      refunds: <RefundsPage />,
      deliveryLogs: <DeliveryLogsPage />,
      ops: <OpsPage />,
      settings: <SettingsPage />,
    };
    return pages[view];
  }, [view]);

  if (!loggedIn) {
    return <LoginPage onLoggedIn={() => setLoggedIn(true)} />;
  }

  return (
    <AdminLayout activeView={view} onViewChange={setView}>
      {page}
    </AdminLayout>
  );
}
