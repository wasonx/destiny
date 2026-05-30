import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type Integration = {
  name: string;
  provider: string;
  realProviderEnabled: boolean;
  note: string;
  mockMode?: boolean;
  signName?: string;
  appIdConfigured?: boolean;
  loginTemplateConfigured?: boolean;
  bindTemplateConfigured?: boolean;
};

type IntegrationStatus = {
  integrations: Record<string, Integration>;
};

const fallbackIntegrations: Record<string, Integration> = {
  wechatLogin: {
    name: '微信登录',
    provider: 'wechat-code2session',
    realProviderEnabled: false,
    note: '等待读取微信登录配置。',
  },
  sms: {
    name: '短信',
    provider: 'mock',
    realProviderEnabled: false,
    note: '手机号验证码为模拟发送。',
  },
  payment: {
    name: '支付',
    provider: 'manual',
    realProviderEnabled: false,
    note: '订单支付由后台人工确认。',
  },
  refund: {
    name: '退款',
    provider: 'manual',
    realProviderEnabled: false,
    note: '退款申请由后台人工处理。',
  },
  courier: {
    name: '快递',
    provider: 'manual',
    realProviderEnabled: false,
    note: '快递信息由后台手工录入。',
  },
};

const integrationOrder = ['wechatLogin', 'sms', 'payment', 'refund', 'courier'];

function statusText(integration: Integration) {
  if (integration.realProviderEnabled) {
    return '真实接入';
  }
  if (integration.provider === 'mock') {
    return '模拟发送';
  }
  return '人工确认';
}

export default function SettingsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [error, setError] = useState('');

  async function loadStatus() {
    setError('');
    try {
      const data = await adminRequest<IntegrationStatus>('/settings/integrations');
      setStatus(data);
    } catch {
      setError('系统设置读取失败');
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  const integrations = integrationOrder.map((key) => [key, status?.integrations?.[key] || fallbackIntegrations[key]] as [string, Integration]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">系统设置</h2>
            <p className="mt-1 text-sm text-on-surface-variant">短信签名、模板、支付占位配置、运费规则和安全表达边界。</p>
          </div>
          <button onClick={() => void loadStatus()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </div>
      </section>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map(([key, integration]) => (
          <div key={key} className="rounded-lg border border-shadow-gray bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl">{integration.name}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{integration.provider}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs ${integration.realProviderEnabled ? 'bg-serene-teal/10 text-serene-teal' : 'bg-wisdom-gold/10 text-wisdom-gold'}`}>
                {statusText(integration)}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6">{integration.note}</p>
            {integration.name === '微信登录' && (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                <dt>AppID</dt>
                <dd>{integration.appIdConfigured ? '已配置' : '未配置'}</dd>
                <dt>Mock</dt>
                <dd>{integration.mockMode ? '开启' : '关闭'}</dd>
              </dl>
            )}
            {integration.name === '短信' && (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                <dt>签名</dt>
                <dd>{integration.signName || '-'}</dd>
                <dt>登录模板</dt>
                <dd>{integration.loginTemplateConfigured ? '已预留' : '未配置'}</dd>
                <dt>绑定模板</dt>
                <dd>{integration.bindTemplateConfigured ? '已预留' : '未配置'}</dd>
              </dl>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
