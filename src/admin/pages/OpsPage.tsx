import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type HealthResponse = {
  ok: boolean;
  dependencies: Record<string, 'ok' | 'down'>;
};

type RecentError = {
  message: string;
  at: string;
};

const dependencyLabels: Record<string, string> = {
  api: 'Node/Express API',
  postgres: 'PostgreSQL',
  neo4j: 'Neo4j',
  medusa: '商城服务',
};

export default function OpsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errors, setErrors] = useState<RecentError[]>([]);
  const [error, setError] = useState('');

  async function loadOps() {
    setError('');
    try {
      const [healthData, errorData] = await Promise.all([
        adminRequest<HealthResponse>('/ops/health'),
        adminRequest<{ errors: RecentError[] }>('/ops/recent-errors'),
      ]);
      setHealth(healthData);
      setErrors(errorData.errors || []);
    } catch {
      setError('运行健康读取失败');
    }
  }

  useEffect(() => {
    void loadOps();
  }, []);

  const dependencies = health?.dependencies || {
    api: 'down',
    postgres: 'down',
    neo4j: 'down',
    medusa: 'down',
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">运行健康</h2>
            <p className="mt-1 text-sm text-on-surface-variant">API、数据库、图数据库和商城服务的运行状态。</p>
          </div>
          <button onClick={() => void loadOps()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </div>
      </section>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <section className="grid gap-4 md:grid-cols-4">
        {Object.entries(dependencies).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-shadow-gray bg-white p-5">
            <p className="text-sm text-on-surface-variant">{dependencyLabels[key] || key}</p>
            <p className={`mt-3 text-2xl font-semibold ${value === 'ok' ? 'text-serene-teal' : 'text-wisdom-gold'}`}>
              {value === 'ok' ? '正常' : '未连接'}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <h3 className="font-serif text-xl">最近错误</h3>
        <div className="mt-3 space-y-2">
          {errors.map((item) => (
            <div key={`${item.at}-${item.message}`} className="rounded-md bg-report-bg p-3 text-sm">
              <div className="font-medium">{item.message}</div>
              <div className="mt-1 text-xs text-on-surface-variant">{item.at}</div>
            </div>
          ))}
          {!errors.length && <p className="text-sm text-on-surface-variant">暂无错误记录</p>}
        </div>
      </section>
    </div>
  );
}
