import React, { useEffect, useState } from 'react';
import { Plus, RefreshCcw, Send } from 'lucide-react';
import { adminRequest } from '../api';

type KnowledgeEntry = {
  id: string;
  title: string;
  summary?: string;
  body?: string;
  tags?: string[];
  risk_note?: string;
  applicable_scope?: Record<string, unknown>;
  concept_keys?: string[];
  source_note?: string;
  status: string;
  version_no?: number;
};

const emptyForm = {
  title: '',
  summary: '',
  body: '',
  tags: '',
  concept_keys: '',
  applicable_scope: '{}',
  risk_note: '',
  source_note: '',
  changeSummary: '知识草稿更新',
};

function listText(value?: string[]) {
  return (value || []).join(', ');
}

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function safeJson(value: string) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

export default function KnowledgePage() {
  const [status, setStatus] = useState('draft');
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadEntries(nextStatus = status) {
    setError('');
    const data = await adminRequest<{ entries: KnowledgeEntry[] }>(`/knowledge?status=${encodeURIComponent(nextStatus)}`);
    setEntries(data.entries || []);
  }

  useEffect(() => {
    void loadEntries(status);
  }, [status]);

  function selectEntry(entry: KnowledgeEntry) {
    setSelectedId(entry.id);
    setForm({
      title: entry.title || '',
      summary: entry.summary || '',
      body: entry.body || '',
      tags: listText(entry.tags),
      concept_keys: listText(entry.concept_keys),
      applicable_scope: JSON.stringify(entry.applicable_scope || {}, null, 2),
      risk_note: entry.risk_note || '',
      source_note: entry.source_note || '',
      changeSummary: `更新 ${entry.title || '知识条目'}`,
    });
  }

  function newDraft() {
    setSelectedId('');
    setForm(emptyForm);
    setMessage('');
    setError('');
  }

  async function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    const payload = {
      title: form.title,
      summary: form.summary,
      body: form.body,
      tags: splitList(form.tags),
      concept_keys: splitList(form.concept_keys),
      applicable_scope: safeJson(form.applicable_scope),
      risk_note: form.risk_note,
      source_note: form.source_note,
    };
    try {
      if (selectedId) {
        await adminRequest(`/knowledge/${encodeURIComponent(selectedId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        const data = await adminRequest<{ entry: KnowledgeEntry }>('/knowledge', { method: 'POST', body: JSON.stringify(payload) });
        setSelectedId(data.entry.id);
      }
      setMessage('保存草稿成功');
      await loadEntries();
    } catch {
      setError('保存草稿失败');
    }
  }

  async function publishEntry() {
    if (!selectedId) {
      setError('请选择知识条目');
      return;
    }
    setError('');
    await adminRequest(`/knowledge/${encodeURIComponent(selectedId)}/publish`, {
      method: 'POST',
      body: JSON.stringify({ changeSummary: form.changeSummary }),
    });
    setMessage('发布成功');
    await loadEntries();
  }

  async function disableEntry() {
    if (!selectedId) {
      setError('请选择知识条目');
      return;
    }
    setError('');
    await adminRequest(`/knowledge/${encodeURIComponent(selectedId)}/disable`, {
      method: 'POST',
      body: JSON.stringify({ changeSummary: form.changeSummary }),
    });
    setMessage('停用成功');
    await loadEntries();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">知识条目</h2>
          <button onClick={() => void loadEntries()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="mb-4 w-full rounded-md border border-shadow-gray px-3 py-2">
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="disabled">已停用</option>
        </select>
        <button onClick={newDraft} className="mb-4 flex w-full items-center justify-center gap-2 rounded-md bg-serene-teal px-4 py-3 text-white">
          <Plus className="h-4 w-4" />
          新建草稿
        </button>
        <div className="space-y-2">
          {entries.map((entry) => (
            <button key={entry.id} onClick={() => selectEntry(entry)} className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedId === entry.id ? 'border-ink-blue bg-surface' : 'border-shadow-gray'}`}>
              <div className="font-medium">{entry.title || '未命名知识'}</div>
              <div className="mt-1 text-xs text-on-surface-variant">版本 {entry.version_no || 1} · {entry.status}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <form onSubmit={saveDraft} className="grid gap-4">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="标题" className="rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="摘要" className="rounded-md border border-shadow-gray px-3 py-2" />
          <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="正文" className="min-h-40 rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="标签，用逗号分隔" className="rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.concept_keys} onChange={(event) => setForm({ ...form, concept_keys: event.target.value })} placeholder="关联概念，如 wood、ten_god.resource" className="rounded-md border border-shadow-gray px-3 py-2" />
          <textarea value={form.applicable_scope} onChange={(event) => setForm({ ...form, applicable_scope: event.target.value })} placeholder="适用范围 JSON" className="min-h-20 rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" />
          <textarea value={form.risk_note} onChange={(event) => setForm({ ...form, risk_note: event.target.value })} placeholder="风险提示" className="min-h-24 rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.source_note} onChange={(event) => setForm({ ...form, source_note: event.target.value })} placeholder="来源" className="rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.changeSummary} onChange={(event) => setForm({ ...form, changeSummary: event.target.value })} placeholder="变更摘要" className="rounded-md border border-shadow-gray px-3 py-2" />
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-4 py-2">
              <Send className="h-4 w-4" />
              保存草稿
            </button>
            <button type="button" onClick={() => void publishEntry()} className="rounded-md bg-ink-blue px-4 py-2 text-white">发布</button>
            <button type="button" onClick={() => void disableEntry()} className="rounded-md border border-shadow-gray px-4 py-2 text-cinnabar">停用</button>
          </div>
          {message && <p className="text-sm text-serene-teal">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </section>
    </div>
  );
}
