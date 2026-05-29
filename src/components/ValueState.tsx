import React, { useEffect, useState } from 'react';
import { fetchValueState, getCustomerToken } from '../lib/customerAuth';

export default function ValueState() {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    if (!getCustomerToken()) return;
    fetchValueState().then(setState).catch(() => setState(null));
  }, []);

  if (!getCustomerToken()) return null;

  const points = state?.points || {};
  return (
    <section className="grid gap-3 rounded-lg border border-shadow-gray bg-white p-5 md:grid-cols-4">
      <div><p className="text-xs text-on-surface-variant">会员状态</p><p className="font-serif text-xl">{state?.membership?.plan_code || '普通客户'}</p></div>
      <div><p className="text-xs text-on-surface-variant">报告次数</p><p className="font-serif text-xl">{state?.reportQuotaBalance ?? 0}</p></div>
      <div><p className="text-xs text-on-surface-variant">积分余额</p><p className="font-serif text-xl">{points.points_balance ?? 0}</p></div>
      <div><p className="text-xs text-on-surface-variant">成长等级</p><p className="font-serif text-xl">{points.growth_level || '启蒙'}</p></div>
    </section>
  );
}
