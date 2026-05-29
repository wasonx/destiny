import React from 'react';

export default function ShipmentsPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">发货管理</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input placeholder="快递公司" className="rounded-md border border-shadow-gray px-3 py-2" />
        <input placeholder="快递单号" className="rounded-md border border-shadow-gray px-3 py-2" />
      </div>
    </div>
  );
}
