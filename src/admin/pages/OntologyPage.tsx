import React, { useEffect, useMemo, useState } from 'react';
import { adminRequest } from '../api';
import GraphCanvas, { GraphEdge, GraphNode } from '../components/GraphCanvas';
import GraphDetailsPanel from '../components/GraphDetailsPanel';

interface GraphPayload {
  focus: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
  concept?: { key?: string; label?: string; type?: string };
  relationships?: Array<{ from: string; to: string; type: string; label?: string }>;
}

type GraphMode = 'concept' | 'knowledge' | 'rule' | 'template' | 'report';

const modes: Array<{ id: GraphMode; label: string; defaultTarget: string; endpoint: (target: string) => string }> = [
  { id: 'concept', label: '概念节点图', defaultTarget: 'wood', endpoint: () => '/graph/concepts/wood/paths' },
  { id: 'knowledge', label: '知识关系图', defaultTarget: 'knowledge-1', endpoint: (target) => `/graph/knowledge/${encodeURIComponent(target)}` },
  { id: 'rule', label: '规则路径图', defaultTarget: 'rule-1', endpoint: (target) => `/graph/rules/${encodeURIComponent(target)}` },
  { id: 'template', label: '模板路径图', defaultTarget: 'template-1', endpoint: (target) => `/graph/templates/${encodeURIComponent(target)}` },
  { id: 'report', label: '报告溯源图', defaultTarget: 'report-1', endpoint: (target) => `/graph/reports/${encodeURIComponent(target)}` },
];

const sampleGraph: GraphPayload = {
  focus: { id: 'concept:wood', type: 'Concept', label: '木', metadata: { conceptType: '五行' } },
  nodes: [
    { id: 'concept:wood', type: 'Concept', label: '木', metadata: { conceptType: '五行' } },
    { id: 'concept:fire', type: 'Concept', label: '火', metadata: { conceptType: '五行' } },
    { id: 'concept:earth', type: 'Concept', label: '土', metadata: { conceptType: '五行' } },
    { id: 'concept:metal', type: 'Concept', label: '金', metadata: { conceptType: '五行' } },
    { id: 'concept:water', type: 'Concept', label: '水', metadata: { conceptType: '五行' } },
  ],
  edges: [
    { id: 'concept:wood->concept:fire:GENERATES', source: 'concept:wood', target: 'concept:fire', type: 'GENERATES', label: '相生' },
    { id: 'concept:wood->concept:earth:RESTRAINS', source: 'concept:wood', target: 'concept:earth', type: 'RESTRAINS', label: '相克' },
    { id: 'concept:metal->concept:wood:RESTRAINS', source: 'concept:metal', target: 'concept:wood', type: 'RESTRAINS', label: '相克' },
    { id: 'concept:water->concept:wood:GENERATES', source: 'concept:water', target: 'concept:wood', type: 'GENERATES', label: '相生' },
  ],
};

function conceptNodeId(value?: string) {
  return `concept:${value || 'unknown'}`;
}

function withDepth(endpoint: string, depth: number) {
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}depth=${depth}`;
}

function normalizeGraphPayload(data: GraphPayload): GraphPayload {
  const nodeAliases = new Map<string, string>();
  const nodes = (data.nodes || []).map((raw) => {
    const item = raw as GraphNode & { key?: string };
    const normalized = item.id ? item : {
      id: conceptNodeId(item.key || item.label),
      type: 'Concept',
      label: item.label || item.key || '未命名',
      metadata: { conceptType: item.type, ...(item.metadata || {}) },
    };
    for (const value of [item.id, item.key, item.label, normalized.id]) {
      if (value) {
        nodeAliases.set(String(value), normalized.id);
        nodeAliases.set(conceptNodeId(String(value)), normalized.id);
      }
    }
    return normalized;
  });

  function resolveNodeRef(value?: string) {
    if (!value) return conceptNodeId();
    return nodeAliases.get(value) || nodeAliases.get(conceptNodeId(value)) || conceptNodeId(value);
  }

  const edges = (data.edges || data.relationships || []).map((raw) => {
    const item = raw as GraphEdge & { from?: string; to?: string };
    const source = resolveNodeRef(item.source || item.from);
    const target = resolveNodeRef(item.target || item.to);
    return {
      id: item.id || `${source}->${target}:${item.type}`,
      source,
      target,
      type: item.type,
      label: item.label || item.type,
      metadata: item.metadata || {},
    };
  });
  const focus = data.focus ? {
    ...data.focus,
    id: resolveNodeRef(data.focus.id || data.focus.label),
    type: data.focus.id ? data.focus.type : 'Concept',
    metadata: data.focus.metadata || (data.focus.id ? {} : { conceptType: data.focus.type }),
  } : (data.concept ? {
    id: resolveNodeRef(data.concept.key || data.concept.label),
    type: 'Concept',
    label: data.concept.label || data.concept.key || '未命名',
    metadata: { conceptType: data.concept.type },
  } : nodes[0]);

  return { focus, nodes, edges };
}

export default function OntologyPage() {
  const [mode, setMode] = useState<GraphMode>('concept');
  const [target, setTarget] = useState('wood');
  const [graph, setGraph] = useState<GraphPayload>(sampleGraph);
  const [selected, setSelected] = useState<GraphNode | GraphEdge | null>(sampleGraph.focus);
  const [search, setSearch] = useState('');
  const [nodeType, setNodeType] = useState('all');
  const [edgeType, setEdgeType] = useState('all');
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeMode = modes.find((item) => item.id === mode) || modes[0];

  async function loadGraph(nextMode = mode, nextTarget = target, nextDepth = depth) {
    const config = modes.find((item) => item.id === nextMode) || modes[0];
    const graphDepth = Math.max(1, Math.min(3, Number(nextDepth) || 2));
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest<GraphPayload>(withDepth(config.endpoint(nextTarget || config.defaultTarget), graphDepth));
      const normalized = normalizeGraphPayload(data);
      setGraph(normalized);
      setSelected(normalized.focus || normalized.nodes[0] || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '图谱加载失败');
      if (nextMode === 'concept') {
        setGraph(sampleGraph);
        setSelected(sampleGraph.focus);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGraph('concept', 'wood');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodeTypes = useMemo(() => ['all', ...Array.from(new Set(graph.nodes.map((node) => node.type)))], [graph.nodes]);
  const edgeTypes = useMemo(() => ['all', ...Array.from(new Set(graph.edges.map((edge) => edge.type)))], [graph.edges]);

  const filteredGraph = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const nodes = graph.nodes.filter((node) => {
      const matchesSearch = !keyword || node.id.toLowerCase().includes(keyword) || node.label.toLowerCase().includes(keyword);
      const matchesType = nodeType === 'all' || node.type === nodeType;
      return matchesSearch && matchesType;
    });
    const visible = new Set(nodes.map((node) => node.id));
    const edges = graph.edges.filter((edge) => {
      const matchesType = edgeType === 'all' || edge.type === edgeType;
      return matchesType && visible.has(edge.source) && visible.has(edge.target);
    });
    return { focus: graph.focus, nodes, edges };
  }, [edgeType, graph, nodeType, search]);

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(560px,1fr)_300px]">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <h2 className="font-serif text-2xl">八字本体图谱</h2>
        <div className="mt-5 grid gap-2">
          {modes.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMode(item.id);
                setTarget(item.defaultTarget);
                void loadGraph(item.id, item.defaultTarget, depth);
              }}
              className={`rounded-md px-3 py-2 text-left text-sm ${mode === item.id ? 'bg-serene-teal text-white' : 'bg-surface'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="mt-5 block text-sm">
          节点或记录 ID
          <input value={target} onChange={(event) => setTarget(event.target.value)} className="mt-2 w-full rounded-md border border-shadow-gray px-3 py-2" />
        </label>
        <label className="mt-3 block text-sm">
          展开范围
          <select value={depth} onChange={(event) => setDepth(Number(event.target.value))} className="mt-2 w-full rounded-md border border-shadow-gray px-3 py-2">
            <option value={1}>一跳关系</option>
            <option value={2}>两跳关系</option>
            <option value={3}>三跳关系</option>
          </select>
        </label>
        <button onClick={() => void loadGraph(mode, target, depth)} className="mt-3 w-full rounded-md bg-ink-blue px-4 py-2 text-white" disabled={loading}>
          {loading ? '加载中' : `加载${activeMode.label}`}
        </button>
        {error && <p className="mt-3 rounded-md bg-surface px-3 py-2 text-xs text-cinnabar">{error}</p>}
      </section>

      <section className="grid gap-4">
        <div className="rounded-lg border border-shadow-gray bg-white p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              节点搜索
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-2 w-full rounded-md border border-shadow-gray px-3 py-2" />
            </label>
            <label className="text-sm">
              节点类型
              <select value={nodeType} onChange={(event) => setNodeType(event.target.value)} className="mt-2 w-full rounded-md border border-shadow-gray px-3 py-2">
                {nodeTypes.map((type) => <option key={type} value={type}>{type === 'all' ? '全部' : type}</option>)}
              </select>
            </label>
            <label className="text-sm">
              关系类型
              <select value={edgeType} onChange={(event) => setEdgeType(event.target.value)} className="mt-2 w-full rounded-md border border-shadow-gray px-3 py-2">
                {edgeTypes.map((type) => <option key={type} value={type}>{type === 'all' ? '全部' : type}</option>)}
              </select>
            </label>
          </div>
        </div>
        <GraphCanvas nodes={filteredGraph.nodes} edges={filteredGraph.edges} selectedId={selected?.id} onSelect={setSelected} />
      </section>

      <div className="xl:col-start-2 2xl:col-start-auto">
        <GraphDetailsPanel item={selected} />
      </div>
    </div>
  );
}
