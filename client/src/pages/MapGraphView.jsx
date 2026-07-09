import { useMemo, memo } from "react";
import dagre from "dagre";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

// Split into its own lazy-loaded chunk — dagre + reactflow's layout engine
// are only needed when the Graph view is actually opened, so nobody pays
// their bundle cost for List/Tree-only sessions.

const STATUS_ICON = { unknown: "○", partial: "◐", known: "●" };
const STATUSES = ["unknown", "partial", "known"];

const GRAPH_STATUS = {
  known: {
    bg: "linear-gradient(135deg, #022c22, #064e3b)",
    border: "#10b981",
    glow: "0 0 20px rgba(16,185,129,0.25)",
    text: "#6ee7b7",
  },
  partial: {
    bg: "linear-gradient(135deg, #3b2f05, #451a03)",
    border: "#f59e0b",
    glow: "0 0 20px rgba(245,158,11,0.2)",
    text: "#fcd34d",
  },
  unknown: {
    bg: "linear-gradient(135deg, #0f172a, #1e293b)",
    border: "#475569",
    glow: "0 0 12px rgba(0,0,0,0.4)",
    text: "#94a3b8",
  },
};

const ConceptNode = memo(({ data }) => {
  const { label, description, status, onCycle } = data;
  const s = GRAPH_STATUS[status] || GRAPH_STATUS.unknown;
  return (
    <div
      onClick={onCycle}
      className="cursor-pointer transition-all duration-200 hover:scale-105 group"
      style={{
        padding: "10px 16px",
        borderRadius: 14,
        minWidth: 160,
        maxWidth: 220,
        border: `2px solid ${s.border}`,
        background: s.bg,
        boxShadow: s.glow,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: s.border, width: 6, height: 6, border: "none" }}
      />
      <div className="flex items-center gap-2 mb-0.5">
        <span style={{ color: s.text, fontSize: 11, opacity: 0.8 }}>
          {STATUS_ICON[status]}
        </span>
        <span
          style={{
            color: "#e2e8f0",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
      </div>
      {description && (
        <p
          style={{
            color: "#94a3b8",
            fontSize: 10,
            lineHeight: 1.4,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {description}
        </p>
      )}
      <div className="flex items-center gap-1.5 mt-1.5">
        {STATUSES.map((st) => (
          <span
            key={st}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: status === st ? s.border : "rgba(100,116,139,0.3)",
              transition: "all 0.2s",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            color: s.text,
            opacity: 0.6,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {status}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: s.border, width: 6, height: 6, border: "none" }}
      />
    </div>
  );
});
ConceptNode.displayName = "ConceptNode";

const NODE_TYPES = { concept: ConceptNode };

export default function MapGraphView({ nodes, progress, cycleStatus }) {
  const { graphNodes, graphEdges } = useMemo(() => {
    if (!nodes.length || !progress) return { graphNodes: [], graphEdges: [] };
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 });
    nodes.forEach((node) => {
      g.setNode(node.id, { width: 200, height: 70 });
    });
    nodes.forEach((node) => {
      if (node.parentId) g.setEdge(node.parentId, node.id);
    });
    dagre.layout(g);

    const gn = nodes.map((node) => {
      const pos = g.node(node.id);
      const status = progress.nodeStatuses?.[node.id] || "unknown";
      return {
        id: node.id,
        type: "concept",
        data: {
          label: node.label,
          description: node.description,
          status,
          onCycle: () => cycleStatus(node.id),
        },
        position: { x: pos.x - 100, y: pos.y - 35 },
      };
    });

    const ge = nodes
      .filter((n) => n.parentId)
      .map((n) => {
        const status = progress.nodeStatuses?.[n.id] || "unknown";
        return {
          id: `${n.parentId}-${n.id}`,
          source: n.parentId,
          target: n.id,
          type: "smoothstep",
          animated: status === "partial",
          style: {
            stroke:
              status === "known"
                ? "#10b981"
                : status === "partial"
                  ? "#f59e0b"
                  : "#334155",
            strokeWidth: status === "known" ? 2 : 1.5,
            opacity: status === "unknown" ? 0.4 : 0.8,
          },
        };
      });

    return { graphNodes: gn, graphEdges: ge };
  }, [nodes, progress, cycleStatus]);

  return (
    <ReactFlow
      nodes={graphNodes}
      edges={graphEdges}
      nodeTypes={NODE_TYPES}
      fitView
      className="bg-[#020617]"
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: "smoothstep" }}
      minZoom={0.3}
      maxZoom={2}
    >
      <Background color="#1e293b" gap={24} size={1} />
      <Controls position="bottom-right" />
      <MiniMap
        nodeColor={(n) => {
          const s = progress.nodeStatuses?.[n.id] || "unknown";
          return s === "known"
            ? "#10b981"
            : s === "partial"
              ? "#f59e0b"
              : "#334155";
        }}
        maskColor="rgba(0,0,0,0.7)"
        style={{ borderRadius: 12 }}
      />
    </ReactFlow>
  );
}
