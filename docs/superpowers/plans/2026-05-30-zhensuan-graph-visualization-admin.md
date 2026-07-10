# 甄好算图谱可视化后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static ontology cards with a usable admin graph workbench that can inspect concept, knowledge, rule, template, and report provenance graphs.

**Architecture:** Keep visualization inside the existing React/Vite admin UI. Use backend graph endpoints from Phase 2, render an SVG-based node/edge canvas with fixed responsive dimensions, and provide mode selection, search, type filters, one-click sample loading, and a detail panel. This first version avoids adding a graph library until layout complexity requires it.

**Tech Stack:** React, TypeScript, Vite, Tailwind utility classes, existing `adminRequest`, SVG.

---

## File Structure

Create:

- `src/admin/components/GraphCanvas.tsx`: renders nodes and edges in an SVG surface with stable layout.
- `src/admin/components/GraphDetailsPanel.tsx`: shows selected node/edge details.

Modify:

- `src/admin/pages/OntologyPage.tsx`: load graph data from backend, add modes, search, filters, detail selection.
- `tests/test_phase_admin_scaffold.py`: assert graph visualization controls and endpoint paths exist.

## Task 1: Add Graph Visualization Scaffold Tests

**Files:**

- Modify: `tests/test_phase_admin_scaffold.py`

- [ ] **Step 1: Add failing assertions**

Add a test that reads `OntologyPage.tsx`, `GraphCanvas.tsx`, and `GraphDetailsPanel.tsx`, asserting:

```python
self.assertIn("GraphCanvas", ontology)
self.assertIn("GraphDetailsPanel", ontology)
self.assertIn("/graph/concepts/wood/paths", ontology)
self.assertIn("/graph/knowledge/", ontology)
self.assertIn("/graph/rules/", ontology)
self.assertIn("/graph/templates/", ontology)
self.assertIn("/graph/reports/", ontology)
self.assertIn("节点搜索", ontology)
self.assertIn("节点类型", ontology)
self.assertIn("关系类型", ontology)
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
python -m unittest tests.test_phase_admin_scaffold
```

Expected: failure because the components and controls do not exist.

## Task 2: Build Graph Components

**Files:**

- Create: `src/admin/components/GraphCanvas.tsx`
- Create: `src/admin/components/GraphDetailsPanel.tsx`

- [ ] **Step 1: Implement `GraphCanvas`**

The component accepts:

```ts
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
```

It renders an SVG with:

- Stable `viewBox`.
- Lines for edges.
- Circles and labels for nodes.
- Click handlers for nodes and edges.
- Empty state when no nodes are available.

- [ ] **Step 2: Implement `GraphDetailsPanel`**

Show:

- Selected item id.
- Type.
- Label.
- Metadata as formatted JSON.

## Task 3: Replace Ontology Page With Graph Workbench

**Files:**

- Modify: `src/admin/pages/OntologyPage.tsx`

- [ ] **Step 1: Load graph data**

Use `adminRequest` and these endpoints:

```text
/graph/concepts/wood/paths
/graph/knowledge/{id}
/graph/rules/{id}
/graph/templates/{id}
/graph/reports/{id}
```

Default mode is concept graph with `wood`.

- [ ] **Step 2: Add controls**

Add:

- Mode buttons: 概念节点图、知识关系图、规则路径图、模板路径图、报告溯源图。
- ID/key input.
- Load button.
- 节点搜索 input.
- 节点类型 filter.
- 关系类型 filter.

- [ ] **Step 3: Filter displayed graph**

Filter nodes by label/id search and node type. Filter edges by relation type and by visible source/target nodes.

- [ ] **Step 4: Render canvas and detail panel**

Use `GraphCanvas` and `GraphDetailsPanel`.

## Task 4: Verify

Run:

```bash
python -m unittest tests.test_phase_admin_scaffold
npm run lint
npm run build
```

Then use browser verification:

```text
1. Start local dev server.
2. Open admin page.
3. Confirm ontology graph page renders controls and non-empty concept graph.
4. Confirm desktop and mobile widths do not overlap controls.
```

## Self-Review Notes

- Phase 3 depends on Phase 2 graph endpoints.
- This first visualization is SVG-based and intentionally avoids a new dependency.
- It satisfies graph visualization start state, while deeper force-directed layout can be added later.
