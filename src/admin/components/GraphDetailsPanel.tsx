import React from 'react';
import { GraphEdge, GraphNode } from './GraphCanvas';

interface Props {
  item: GraphNode | GraphEdge | null;
  onFocusNode?: (node: GraphNode, depth: number) => void;
}

function isEdge(item: GraphNode | GraphEdge): item is GraphEdge {
  return 'source' in item && 'target' in item;
}

export default function GraphDetailsPanel({ item, onFocusNode }: Props) {
  if (!item) {
    return (
      <aside className="rounded-lg border border-shadow-gray bg-white p-5">
        <h3 className="font-serif text-lg">详情</h3>
        <p className="mt-3 text-sm text-on-surface-variant">点击节点或关系查看来源、类型和元数据。</p>
      </aside>
    );
  }

  const metadata = item.metadata || {};

  return (
    <aside className="rounded-lg border border-shadow-gray bg-white p-5">
      <h3 className="font-serif text-lg">详情</h3>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-on-surface-variant">ID</dt>
          <dd className="break-all font-mono text-xs">{item.id}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">类型</dt>
          <dd>{item.type}</dd>
        </div>
        {'label' in item && (
          <div>
            <dt className="text-on-surface-variant">名称</dt>
            <dd>{item.label}</dd>
          </div>
        )}
        {isEdge(item) && (
          <>
            <div>
              <dt className="text-on-surface-variant">起点</dt>
              <dd className="break-all font-mono text-xs">{item.source}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">终点</dt>
              <dd className="break-all font-mono text-xs">{item.target}</dd>
            </div>
          </>
        )}
      </dl>
      {!isEdge(item) && onFocusNode && (
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={() => onFocusNode(item, 1)} className="rounded-md bg-ink-blue px-3 py-2 text-sm text-white">
            以选中节点展开一跳
          </button>
          <button type="button" onClick={() => onFocusNode(item, 2)} className="rounded-md border border-shadow-gray px-3 py-2 text-sm">
            以选中节点展开两跳
          </button>
        </div>
      )}
      <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-surface p-3 text-xs">{JSON.stringify(metadata, null, 2)}</pre>
    </aside>
  );
}
