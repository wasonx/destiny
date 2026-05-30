import React, { useMemo } from 'react';

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId?: string;
  onSelect: (item: GraphNode | GraphEdge) => void;
}

const colors: Record<string, string> = {
  Concept: '#2f8f83',
  Knowledge: '#425c8a',
  Rule: '#8a5a28',
  Template: '#7d4e82',
  Report: '#a5433f',
  RiskBoundary: '#6b7280',
};

export default function GraphCanvas({ nodes, edges, selectedId, onSelect }: Props) {
  const layout = useMemo(() => {
    const width = 760;
    const height = 460;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.33;
    const positions = new Map<string, { x: number; y: number }>();

    nodes.forEach((node, index) => {
      if (index === 0) {
        positions.set(node.id, { x: centerX, y: centerY });
        return;
      }
      const angle = ((index - 1) / Math.max(nodes.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    return { width, height, positions };
  }, [nodes]);

  if (!nodes.length) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-shadow-gray bg-surface text-sm text-on-surface-variant">
        暂无图谱数据
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-shadow-gray bg-white">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-[420px] w-full md:h-[500px]" role="img" aria-label="图谱可视化">
        <defs>
          <marker id="graph-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L8,3 z" fill="#9ca3af" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const source = layout.positions.get(edge.source);
          const target = layout.positions.get(edge.target);
          if (!source || !target) return null;
          const selected = selectedId === edge.id;
          return (
            <g key={edge.id} onClick={() => onSelect(edge)} className="cursor-pointer">
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={selected ? '#b7791f' : '#c7c7bf'}
                strokeWidth={selected ? 3 : 1.5}
                markerEnd="url(#graph-arrow)"
              />
              <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 6} textAnchor="middle" className="fill-on-surface-variant text-[10px]">
                {edge.label || edge.type}
              </text>
            </g>
          );
        })}
        {nodes.map((node) => {
          const point = layout.positions.get(node.id);
          if (!point) return null;
          const selected = selectedId === node.id;
          return (
            <g key={node.id} transform={`translate(${point.x}, ${point.y})`} onClick={() => onSelect(node)} className="cursor-pointer">
              <circle r={selected ? 32 : 27} fill={colors[node.type] || '#4b5563'} stroke={selected ? '#f2c86b' : '#ffffff'} strokeWidth={selected ? 4 : 2} />
              <text y="-36" textAnchor="middle" className="fill-ink-blue text-[12px] font-medium">
                {node.label || node.id}
              </text>
              <text y="5" textAnchor="middle" className="fill-white text-[10px]">
                {node.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
