import React from 'react';
import {
  Activity,
  Boxes,
  BrainCircuit,
  ClipboardList,
  CreditCard,
  FileText,
  Gauge,
  GitBranch,
  Home,
  Layers,
  Package,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  WalletCards,
} from 'lucide-react';

export type AdminView =
  | 'dashboard'
  | 'users'
  | 'ontology'
  | 'knowledge'
  | 'testbench'
  | 'rules'
  | 'templates'
  | 'reports'
  | 'membership'
  | 'entitlements'
  | 'points'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'payments'
  | 'shipments'
  | 'refunds'
  | 'deliveryLogs'
  | 'ops'
  | 'settings';

const menu: Array<{ id: AdminView; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: '总览', icon: <Home className="h-4 w-4" /> },
  { id: 'users', label: '用户管理', icon: <Users className="h-4 w-4" /> },
  { id: 'ontology', label: '八字本体图谱', icon: <GitBranch className="h-4 w-4" /> },
  { id: 'knowledge', label: '知识条目', icon: <BrainCircuit className="h-4 w-4" /> },
  { id: 'testbench', label: '测试台', icon: <Gauge className="h-4 w-4" /> },
  { id: 'rules', label: '分析规则', icon: <Layers className="h-4 w-4" /> },
  { id: 'templates', label: '报告模板', icon: <FileText className="h-4 w-4" /> },
  { id: 'reports', label: '报告记录', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'membership', label: '会员管理', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'entitlements', label: '权益账户', icon: <WalletCards className="h-4 w-4" /> },
  { id: 'points', label: '积分账户', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'products', label: '商品管理', icon: <Package className="h-4 w-4" /> },
  { id: 'inventory', label: '库存管理', icon: <Boxes className="h-4 w-4" /> },
  { id: 'orders', label: '订单管理', icon: <ReceiptText className="h-4 w-4" /> },
  { id: 'payments', label: '支付管理', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'shipments', label: '发货管理', icon: <Truck className="h-4 w-4" /> },
  { id: 'refunds', label: '退款管理', icon: <RefreshCcw className="h-4 w-4" /> },
  { id: 'deliveryLogs', label: '发放记录', icon: <Activity className="h-4 w-4" /> },
  { id: 'ops', label: '运行健康', icon: <Activity className="h-4 w-4" /> },
];

interface Props {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  children: React.ReactNode;
}

export default function AdminLayout({ activeView, onViewChange, children }: Props) {
  return (
    <div className="min-h-screen bg-[#f7f7f4] text-ink-blue">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-shadow-gray bg-white lg:block">
        <div className="h-16 border-b border-shadow-gray px-5 flex items-center">
          <div>
            <h1 className="font-serif text-xl font-bold">甄算后台</h1>
            <p className="text-xs text-on-surface-variant">知识库与运营管理</p>
          </div>
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                activeView === item.id ? 'bg-serene-teal text-white' : 'text-ink-blue hover:bg-surface'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-shadow-gray bg-white/90 backdrop-blur px-4 lg:px-8 h-16 flex items-center justify-between">
          <div>
            <p className="text-xs text-wisdom-gold">ZHENSUAN ADMIN</p>
            <h2 className="font-serif text-lg">甄算后台</h2>
          </div>
          <a href="/" className="rounded-md border border-shadow-gray px-3 py-2 text-sm hover:bg-surface">打开 H5</a>
        </header>
        <div className="lg:hidden border-b border-shadow-gray bg-white overflow-x-auto">
          <div className="flex gap-2 px-4 py-3 min-w-max">
            {menu.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`rounded-md px-3 py-2 text-sm ${activeView === item.id ? 'bg-serene-teal text-white' : 'bg-surface'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
