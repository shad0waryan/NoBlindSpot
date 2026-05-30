import { useState, useEffect, useCallback, useMemo, lazy, Suspense, memo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { mapsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner, ProgressBar } from "../components/ui";
import { APP_CONFIG } from "../config/appConfig";
import dagre from "dagre";
import { Handle, Position } from "reactflow";

const ReactFlow = lazy(() => import("reactflow").then((m) => ({ default: m.default })));
import "reactflow/dist/style.css";
import { Background, Controls, MiniMap } from "reactflow";

const STATUSES = ["unknown", "partial", "known"];
const NEXT_STATUS = { unknown: "partial", partial: "known", known: "unknown" };
const VIEW_MODES = ["list", "tree", "graph"];
const STATUS_FILTERS = ["all", "unknown", "partial", "known"];

const STATUS_ICON = { unknown: "○", partial: "◐", known: "●" };
const STATUS_COLORS = {
  known:   { border: "border-emerald-500/30", bg: "bg-emerald-500/5",  badge: "bg-emerald-500/20 text-emerald-300", active: "bg-emerald-500/20 text-emerald-300 border-emerald-500" },
  partial: { border: "border-amber-500/30",   bg: "bg-amber-500/5",    badge: "bg-amber-500/20 text-amber-300",   active: "bg-amber-500/20 text-amber-300 border-amber-500"   },
  unknown: { border: "border-slate-700",       bg: "bg-slate-800",      badge: "bg-slate-700 text-slate-400",       active: "bg-slate-700 text-slate-300 border-slate-500"       },
};

const GRAPH_STATUS = {
  known:   { bg: "linear-gradient(135deg, #022c22, #064e3b)", border: "#10b981", glow: "0 0 20px rgba(16,185,129,0.25)", text: "#6ee7b7" },
  partial: { bg: "linear-gradient(135deg, #3b2f05, #451a03)", border: "#f59e0b", glow: "0 0 20px rgba(245,158,11,0.2)", text: "#fcd34d" },
  unknown: { bg: "linear-gradient(135deg, #0f172a, #1e293b)", border: "#475569", glow: "0 0 12px rgba(0,0,0,0.4)", text: "#94a3b8" },
};

const ConceptNode = memo(({ data }) => {
  const { label, description, status, onCycle } = data;
  const s = GRAPH_STATUS[status] || GRAPH_STATUS.unknown;
  return (
    <div
      onClick={onCycle}
      className="cursor-pointer transition-all duration-200 hover:scale-105 group"
      style={{
        padding: "10px 16px", borderRadius: 14, minWidth: 160, maxWidth: 220,
        border: `2px solid ${s.border}`, background: s.bg, boxShadow: s.glow,
      }}>
      <Handle type="target" position={Position.Top} style={{ background: s.border, width: 6, height: 6, border: "none" }} />
      <div className="flex items-center gap-2 mb-0.5">
        <span style={{ color: s.text, fontSize: 11, opacity: 0.8 }}>{STATUS_ICON[status]}</span>
        <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, fontFamily: "'Outfit', sans-serif", lineHeight: 1.3 }}>{label}</span>
      </div>
      {description && (
        <p style={{ color: "#94a3b8", fontSize: 10, lineHeight: 1.4, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{description}</p>
      )}
      <div className="flex items-center gap-1.5 mt-1.5">
        {STATUSES.map((st) => (
          <span key={st} style={{
            width: 8, height: 8, borderRadius: 4,
            background: status === st ? s.border : "rgba(100,116,139,0.3)",
            transition: "all 0.2s",
          }} />
        ))}
        <span style={{ marginLeft: "auto", fontSize: 9, color: s.text, opacity: 0.6, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{status}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: s.border, width: 6, height: 6, border: "none" }} />
    </div>
  );
});
ConceptNode.displayName = "ConceptNode";

const NODE_TYPES = { concept: ConceptNode };

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const TIMER_PRESETS = [
  { id: "pomodoro", label: "Pomodoro", focus: 25, break: 5 },
  { id: "short",    label: "Short",    focus: 15, break: 3 },
  { id: "long",     label: "Deep Work", focus: 50, break: 10 },
  { id: "sprint",   label: "Sprint",   focus: 10, break: 2 },
];

let _lastTimer = { presetId: "pomodoro", focusMin: 25, breakMin: 5 };
function getLastTimer() { return _lastTimer; }
function saveLastTimer(cfg) { _lastTimer = { ...cfg }; }

// Keyboard shortcut help overlay
const ShortcutsModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
    <div className="card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-display font-semibold">Keyboard Shortcuts</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="space-y-1">
        {[
          { keys: ["1"], desc: "Switch to List view" },
          { keys: ["2"], desc: "Switch to Tree view" },
          { keys: ["3"], desc: "Switch to Graph view" },
          { keys: ["?"], desc: "Show this help" },
          { keys: ["Esc"], desc: "Close panel / Go back" },
          { keys: ["←", "→"], desc: "Navigate flashcards" },
          { keys: ["Space"], desc: "Flip flashcard" },
        ].map(({ keys, desc }) => (
          <div key={desc} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
            <span className="text-sm text-slate-400">{desc}</span>
            <div className="flex gap-1">
              {keys.map((k) => (
                <kbd key={k} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono">{k}</kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600 mt-4">Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">?</kbd> anytime to open this</p>
    </div>
  </div>
);

const MapView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [topicMap, setTopicMap] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState(user?.preferences?.defaultView || "list");
  const [explaining, setExplaining] = useState(null);
  const [explanations, setExplanations] = useState({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activePanel, setActivePanel] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [pathData, setPathData] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [collapsed, setCollapsed] = useState({});

  const [flashIdx, setFlashIdx] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [flashDeck, setFlashDeck] = useState([]);

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(() => getLastTimer().focusMin * 60);
  const [timerMode, setTimerMode] = useState("focus");
  const [timerPreset, setTimerPreset] = useState(() => getLastTimer().presetId);
  const [customFocus, setCustomFocus] = useState(() => getLastTimer().focusMin);
  const [customBreak, setCustomBreak] = useState(() => getLastTimer().breakMin);

  useEffect(() => { fetchMap(); }, [id]);

  const fetchMap = async () => {
    try {
      const { data } = await mapsAPI.getById(id);
      setTopicMap(data.topicMap);
      setNodes(data.topicMap.nodes);
      setProgress(data.progress);
      document.title = `${data.topicMap.topic} — ${APP_CONFIG.name}`;
    } catch { setError("Failed to load map"); }
    finally { setLoading(false); }
  };

  const handleExplain = async (node) => {
    if (explanations[node.id]) {
      setExplanations((prev) => { const n = { ...prev }; delete n[node.id]; return n; });
      return;
    }
    setExplaining(node.id);
    try {
      const { data } = await mapsAPI.explain(node.label, topicMap?.topic);
      setExplanations((prev) => ({ ...prev, [node.id]: data.explanation }));
    } catch {
      setExplanations((prev) => ({ ...prev, [node.id]: "Failed to load explanation." }));
    } finally { setExplaining(null); }
  };

  const updateStatus = useCallback((nodeId, status) => {
    setProgress((prev) => ({ ...prev, nodeStatuses: { ...prev.nodeStatuses, [nodeId]: status } }));
  }, []);

  const cycleStatus = useCallback((nodeId) => {
    setProgress((prev) => {
      const cur = prev.nodeStatuses?.[nodeId] || "unknown";
      return { ...prev, nodeStatuses: { ...prev.nodeStatuses, [nodeId]: NEXT_STATUS[cur] } };
    });
  }, []);

  const bulkSetStatus = (status) => {
    const updated = { ...progress.nodeStatuses };
    nodes.forEach((n) => { updated[n.id] = status; });
    setProgress((prev) => ({ ...prev, nodeStatuses: updated }));
    toast(`All nodes marked as ${status}`, { type: "info" });
  };

  useEffect(() => {
    if (!progress) return;
    const timeout = setTimeout(async () => {
      try {
        setSaving(true);
        const payload = Object.entries(progress.nodeStatuses || {}).map(([nodeId, status]) => ({ id: nodeId, status }));
        await mapsAPI.updateNodes(id, payload);
      } catch { toast("Failed to save progress", { type: "error" }); }
      finally { setSaving(false); }
    }, 800);
    return () => clearTimeout(timeout);
  }, [progress]);

  const handleDelete = async () => {
    try {
      await mapsAPI.delete(id);
      toast("Map deleted", { type: "success" });
      navigate("/dashboard");
    } catch { toast("Failed to delete", { type: "error" }); }
    setDeleteConfirm(false);
  };

  const startQuiz = async () => {
    setActivePanel("quiz"); setQuizData(null); setQuizAnswers({}); setQuizSubmitted(false); setQuizLoading(true);
    try {
      const gaps = nodes.filter((n) => (progress?.nodeStatuses?.[n.id] || "unknown") !== "known").map((n) => n.label);
      if (!gaps.length) { toast("All mastered!", { type: "success" }); setActivePanel(null); setQuizLoading(false); return; }
      const { data } = await mapsAPI.quiz(gaps, topicMap?.topic);
      setQuizData(data.questions);
    } catch { toast("Failed to generate quiz", { type: "error" }); setActivePanel(null); }
    finally { setQuizLoading(false); }
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    const correct = quizData.filter((q, i) => quizAnswers[i] === q.correct).length;
    const pct = Math.round((correct / quizData.length) * 100);
    toast(`${correct}/${quizData.length} correct — ${pct}%!`, { type: correct === quizData.length ? "success" : "info" });
  };

  const loadPath = async () => {
    setActivePanel("path"); setPathData(null); setPathLoading(true);
    try {
      const { data } = await mapsAPI.learningPath(id);
      setPathData(data.path);
      if (!data.path.length) toast(data.message || "All mastered!", { type: "success" });
    } catch { toast("Failed to generate learning path", { type: "error" }); setActivePanel(null); }
    finally { setPathLoading(false); }
  };

  const startFlashcards = () => {
    const deck = nodes.map((n) => ({
      id: n.id, label: n.label, description: n.description || "",
      status: progress?.nodeStatuses?.[n.id] || "unknown",
      note: progress?.nodeNotes?.[n.id] || "",
    }));
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    setFlashDeck(deck);
    setFlashIdx(0);
    setFlashFlipped(false);
    setActivePanel("flashcards");
  };

  const openNoteEditor = (nodeId) => { setEditingNote(nodeId); setNoteText(progress?.nodeNotes?.[nodeId] || ""); };
  const saveNodeNote = async () => {
    if (!editingNote) return;
    try {
      const { data } = await mapsAPI.saveNote(id, editingNote, noteText);
      setProgress((prev) => ({ ...prev, nodeNotes: data.nodeNotes }));
      toast("Note saved", { type: "success", duration: 1500 });
    } catch { toast("Failed to save note", { type: "error" }); }
    setEditingNote(null); setNoteText("");
  };

  const handleExport = async () => {
    try {
      const { data } = await mapsAPI.exportMap(id);
      const blob = new Blob([data.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
      toast("Exported!", { type: "success" });
    } catch { toast("Export failed", { type: "error" }); }
  };

  const focusDuration = customFocus * 60;
  const breakDuration = customBreak * 60;

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          const nextMode = timerMode === "focus" ? "break" : "focus";
          const nextDur = nextMode === "focus" ? focusDuration : breakDuration;
          setTimerMode(nextMode);
          toast(timerMode === "focus" ? "Focus done! Take a break." : "Break over! Time to focus.", { type: "success", duration: 4000 });
          return nextDur;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerMode, focusDuration, breakDuration]);

  const toggleTimer = () => setTimerRunning((r) => !r);

  const applyPreset = (preset) => {
    setTimerPreset(preset.id);
    setCustomFocus(preset.focus);
    setCustomBreak(preset.break);
    setTimerSeconds(timerMode === "focus" ? preset.focus * 60 : preset.break * 60);
    setTimerRunning(false);
    saveLastTimer({ presetId: preset.id, focusMin: preset.focus, breakMin: preset.break });
  };

  const applyCustomTimer = (f, b) => {
    const fm = Math.max(1, Math.min(120, f));
    const bm = Math.max(1, Math.min(30, b));
    setCustomFocus(fm);
    setCustomBreak(bm);
    setTimerPreset("custom");
    setTimerSeconds(timerMode === "focus" ? fm * 60 : bm * 60);
    setTimerRunning(false);
    saveLastTimer({ presetId: "custom", focusMin: fm, breakMin: bm });
  };

  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "?") { setShowShortcuts((s) => !s); return; }
    if (e.key === "1") setViewMode("list");
    else if (e.key === "2") setViewMode("tree");
    else if (e.key === "3") setViewMode("graph");
    else if (e.key === "Escape") {
      if (showShortcuts) { setShowShortcuts(false); return; }
      if (activePanel) { setActivePanel(null); return; }
      navigate("/dashboard");
    } else if (activePanel === "flashcards") {
      if (e.key === "ArrowRight") { setFlashIdx((i) => Math.min(flashDeck.length - 1, i + 1)); setFlashFlipped(false); }
      else if (e.key === "ArrowLeft") { setFlashIdx((i) => Math.max(0, i - 1)); setFlashFlipped(false); }
      else if (e.key === " ") { e.preventDefault(); setFlashFlipped((f) => !f); }
    }
  }, [navigate, activePanel, showShortcuts, flashDeck.length]);

  useEffect(() => { window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [handleKeyDown]);

  const filteredNodes = useMemo(() => {
    let r = nodes;
    if (statusFilter !== "all") r = r.filter((n) => (progress?.nodeStatuses?.[n.id] || "unknown") === statusFilter);
    if (search.trim()) { const q = search.trim().toLowerCase(); r = r.filter((n) => n.label.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)); }
    return r;
  }, [nodes, statusFilter, search, progress]);

  const stats = useMemo(() => {
    let known = 0, partial = 0, unknown = 0;
    nodes.forEach((n) => { const s = progress?.nodeStatuses?.[n.id] || "unknown"; if (s === "known") known++; else if (s === "partial") partial++; else unknown++; });
    return { total: nodes.length, known, partial, unknown };
  }, [nodes, progress]);

  const depthAnalytics = useMemo(() => {
    const d = {};
    nodes.forEach((n) => { const depth = n.depth ?? 0; if (!d[depth]) d[depth] = { total: 0, known: 0, partial: 0, unknown: 0 }; d[depth].total++; d[depth][progress?.nodeStatuses?.[n.id] || "unknown"]++; });
    return d;
  }, [nodes, progress]);

  const buildTree = useCallback(() => {
    const map = {}; const roots = [];
    nodes.forEach((n) => { map[n.id] = { ...n, children: [] }; });
    nodes.forEach((n) => { if (n.parentId === null) roots.push(map[n.id]); else if (map[n.parentId]) map[n.parentId].children.push(map[n.id]); });
    return roots;
  }, [nodes]);

  const toggleCollapse = (nodeId) => setCollapsed((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));

  // Filter tree nodes by search
  const treeMatchesSearch = useCallback((node) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    if (node.label.toLowerCase().includes(q) || node.description?.toLowerCase().includes(q)) return true;
    return node.children?.some((c) => treeMatchesSearch(c));
  }, [search]);

  const renderTree = (treeNodes, depth = 0) => {
    return treeNodes
      .filter((node) => treeMatchesSearch(node))
      .map((node) => {
        const status = progress.nodeStatuses?.[node.id] || "unknown";
        const hasChildren = node.children.length > 0;
        const isCollapsed = collapsed[node.id];
        const hasNote = !!progress.nodeNotes?.[node.id];
        const depthColors = ["border-brand-500/20", "border-violet-500/20", "border-teal-500/20", "border-amber-500/20", "border-rose-500/20"];
        const leftBorder = depthColors[depth % depthColors.length];
        const matchesSearch = search.trim() && (node.label.toLowerCase().includes(search.trim().toLowerCase()) || node.description?.toLowerCase().includes(search.trim().toLowerCase()));

        return (
          <div key={node.id} className="animate-view-in">
            <div
              className={`group flex items-start gap-2.5 p-3 rounded-xl mb-1.5 transition-all duration-200 hover:bg-surface-hover/50 border-l-2 ${leftBorder} ${matchesSearch ? "bg-brand-500/5" : ""}`}
              style={{ marginLeft: `${depth * 20}px` }}>
              {hasChildren ? (
                <button onClick={() => toggleCollapse(node.id)} className="mt-0.5 w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-surface-hover transition-all shrink-0">
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              ) : <span className="w-5 shrink-0" />}

              <button onClick={() => cycleStatus(node.id)} className="mt-0.5 shrink-0" title={`Click to cycle: ${status} → ${NEXT_STATUS[status]}`}>
                <span className={`text-xs inline-block transition-transform duration-200 hover:scale-125 ${status === "known" ? "text-emerald-400" : status === "partial" ? "text-amber-400" : "text-slate-500"}`}>
                  {STATUS_ICON[status]}
                </span>
              </button>

              <div className="flex-1 min-w-0">
                <span className="text-white font-medium text-sm">{node.label}</span>
                {node.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{node.description}</p>}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {hasNote && (
                  <button onClick={() => openNoteEditor(node.id)} title="Has note" className="text-amber-400/70 hover:text-amber-400 transition-colors">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
                  </button>
                )}
                <span className={`text-[9px] px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_COLORS[status].badge}`}>{status}</span>
              </div>
            </div>

            {hasChildren && !isCollapsed && (
              <div className="transition-all duration-300">{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      });
  };

  const { graphNodes, graphEdges } = useMemo(() => {
    if (!nodes.length || !progress) return { graphNodes: [], graphEdges: [] };
    const g = new dagre.graphlib.Graph(); g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 });
    nodes.forEach((node) => { g.setNode(node.id, { width: 200, height: 70 }); });
    nodes.forEach((node) => { if (node.parentId) g.setEdge(node.parentId, node.id); });
    dagre.layout(g);

    const gn = nodes.map((node) => {
      const pos = g.node(node.id);
      const status = progress.nodeStatuses?.[node.id] || "unknown";
      return {
        id: node.id, type: "concept",
        data: { label: node.label, description: node.description, status, onCycle: () => cycleStatus(node.id) },
        position: { x: pos.x - 100, y: pos.y - 35 },
      };
    });

    const ge = nodes.filter((n) => n.parentId).map((n) => {
      const status = progress.nodeStatuses?.[n.id] || "unknown";
      return {
        id: `${n.parentId}-${n.id}`, source: n.parentId, target: n.id,
        type: "smoothstep",
        animated: status === "partial",
        style: {
          stroke: status === "known" ? "#10b981" : status === "partial" ? "#f59e0b" : "#334155",
          strokeWidth: status === "known" ? 2 : 1.5,
          opacity: status === "unknown" ? 0.4 : 0.8,
        },
      };
    });

    return { graphNodes: gn, graphEdges: ge };
  }, [nodes, progress, cycleStatus]);

  if (loading || !progress) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;

  const VIEW_ICONS = {
    list: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>,
    tree: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
    graph: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="5" cy="12" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M7 11l10-4M7 13l10 4" /></svg>,
  };

  const currentFlashcard = flashDeck[flashIdx]
    ? {
        ...flashDeck[flashIdx],
        label: flashDeck[flashIdx].label || topicMap?.topic || "Concept",
        status: progress?.nodeStatuses?.[flashDeck[flashIdx].id] || "unknown",
        note: progress?.nodeNotes?.[flashDeck[flashIdx].id] || "",
      }
    : null;

  const quizScore = quizSubmitted && quizData
    ? { correct: quizData.filter((q, i) => quizAnswers[i] === q.correct).length, total: quizData.length }
    : null;

  return (
    <div className="w-full h-screen flex flex-col px-4 sm:px-8 lg:px-16 py-4 sm:py-6">
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* HEADER */}
      <div className="mb-3 sm:mb-4 shrink-0 animate-slide-down">
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Link to="/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-white capitalize truncate max-w-[200px] sm:max-w-none font-medium">{topicMap.topic}</span>
        </nav>

        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white capitalize">{topicMap.topic}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.total} concepts &nbsp;·&nbsp;
              <span className="text-emerald-400">{stats.known} known</span>
              {stats.partial > 0 && <><span className="text-slate-600"> · </span><span className="text-amber-400">{stats.partial} partial</span></>}
              {stats.unknown > 0 && <><span className="text-slate-600"> · </span><span className="text-slate-400">{stats.unknown} to learn</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Focus Timer mini */}
            <button onClick={() => setActivePanel(activePanel === "timer" ? null : "timer")}
              className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg border transition-all ${timerRunning ? "border-brand-500/50 text-brand-400 bg-brand-500/10 animate-pulse" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {formatTimer(timerSeconds)}
            </button>

            {/* Shortcuts hint */}
            <button onClick={() => setShowShortcuts(true)}
              className="hidden sm:flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 font-mono">
              <kbd className="text-[10px]">?</kbd>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-1.5 h-1.5 rounded-full ${saving ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
              {saving ? "Saving..." : "Synced"}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
          <div className="flex gap-1.5">
            {VIEW_MODES.map((mode, i) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg border text-xs capitalize transition-all duration-200 flex items-center gap-1.5 font-medium ${
                  viewMode === mode ? "border-brand-500 text-white bg-brand-500/10 shadow-sm shadow-brand-500/10" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                }`} title={`${mode} (${i + 1})`}>
                {VIEW_ICONS[mode]} {mode}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button onClick={startQuiz} className="px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 font-medium border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:border-violet-400" title="Quiz yourself on gaps">Quiz</button>
            <button onClick={loadPath} className="px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 font-medium border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:border-teal-400" title="Generate learning path">Path</button>
            <button onClick={startFlashcards} className="px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 font-medium border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:border-pink-400" title="Study with flashcards">Cards</button>
            <button onClick={() => setActivePanel(activePanel === "analytics" ? null : "analytics")} className="px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 font-medium border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400">Stats</button>
            <button onClick={handleExport} className="px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 font-medium border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-300" title="Export to Markdown">Export</button>
            <button onClick={() => setDeleteConfirm(true)} className="px-2.5 py-1 rounded-lg border text-xs transition-all duration-200 font-medium border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400">Delete</button>
          </div>
        </div>

        <ProgressBar known={stats.known} partial={stats.partial} total={stats.total} />

        {/* Search/filter bar — shown for list and tree views */}
        {(viewMode === "list" || viewMode === "tree") && (
          <div className="flex flex-col sm:flex-row gap-2 mt-2.5 animate-view-in">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search concepts..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-8 py-1.5 text-xs !rounded-lg" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            {viewMode === "list" && (
              <div className="flex gap-1 items-center flex-wrap">
                {STATUS_FILTERS.map((f) => (
                  <button key={f} onClick={() => setStatusFilter(f)}
                    className={`px-2 py-1 text-[11px] rounded-md border capitalize transition-all font-medium ${statusFilter === f ? "border-brand-500 text-white bg-brand-500/10" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}>
                    {f}{f !== "all" && ` (${f === "known" ? stats.known : f === "partial" ? stats.partial : stats.unknown})`}
                  </button>
                ))}
                <span className="w-px h-4 bg-slate-700 mx-0.5 hidden sm:block" />
                <button onClick={() => bulkSetStatus("known")} className="px-2 py-1 text-[11px] rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition font-medium">All Known</button>
                <button onClick={() => bulkSetStatus("unknown")} className="px-2 py-1 text-[11px] rounded-md border border-slate-700 text-slate-500 hover:bg-slate-700 transition font-medium">Reset</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PANELS */}
      {activePanel && activePanel !== "flashcards" && activePanel !== "timer" && (
        <div className="mb-3 shrink-0 animate-scale-in">
          <div className="glass rounded-2xl p-4 sm:p-5 max-h-[45vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-display font-semibold text-sm capitalize">{activePanel === "path" ? "Learning Path" : activePanel}</h3>
                {quizScore && activePanel === "quiz" && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${quizScore.correct === quizScore.total ? "bg-emerald-500/20 text-emerald-300" : quizScore.correct >= quizScore.total / 2 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>
                    {quizScore.correct}/{quizScore.total} · {Math.round((quizScore.correct / quizScore.total) * 100)}%
                  </span>
                )}
              </div>
              <button onClick={() => setActivePanel(null)} className="text-[11px] text-slate-500 hover:text-white border border-slate-700 px-2 py-0.5 rounded-lg transition">Esc</button>
            </div>

            {activePanel === "quiz" && (
              quizLoading ? (
                <div className="flex flex-col items-center gap-3 py-6 text-slate-400 text-sm">
                  <Spinner />
                  <span>Generating quiz from your knowledge gaps...</span>
                </div>
              ) : quizData ? (
                <div className="space-y-3">
                  {quizData.map((q, qi) => (
                    <div key={qi} className={`p-3 rounded-xl border transition-all ${quizSubmitted ? (quizAnswers[qi] === q.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5") : "border-slate-700 bg-slate-800/30"}`}>
                      <p className="text-sm text-white font-medium mb-2">{qi + 1}. {q.question}</p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <button key={oi} disabled={quizSubmitted} onClick={() => setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm border transition-all ${
                              quizSubmitted ? oi === q.correct ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : quizAnswers[qi] === oi ? "border-red-500 bg-red-500/10 text-red-300" : "border-slate-700 text-slate-500"
                              : quizAnswers[qi] === oi ? "border-brand-500 bg-brand-500/10 text-white" : "border-slate-700 text-slate-400 hover:border-slate-500"
                            }`}>{opt}</button>
                        ))}
                      </div>
                      {quizSubmitted && <p className="text-xs text-slate-400 mt-2 italic">{q.explanation}</p>}
                    </div>
                  ))}
                  {!quizSubmitted ? (
                    <button onClick={submitQuiz} disabled={Object.keys(quizAnswers).length < quizData.length}
                      className="btn-primary text-sm w-full sm:w-auto disabled:opacity-40">
                      Submit ({Object.keys(quizAnswers).length}/{quizData.length})
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={startQuiz} className="btn-primary text-sm">Retake</button>
                      <button onClick={() => setActivePanel(null)} className="btn-ghost text-sm">Close</button>
                    </div>
                  )}
                </div>
              ) : null
            )}

            {activePanel === "path" && (
              pathLoading ? (
                <div className="flex flex-col items-center gap-3 py-6 text-slate-400 text-sm">
                  <Spinner />
                  <span>Building your personalized learning path...</span>
                </div>
              ) : pathData?.length ? (
                <div>
                  <p className="text-xs text-slate-500 mb-3">{pathData.length} concepts to study, in recommended order</p>
                  <ol className="space-y-2">
                    {pathData.map((item, i) => {
                      // Find the node matching this label
                      const matchNode = nodes.find((n) => n.label.toLowerCase() === item.label.toLowerCase());
                      const nodeStatus = matchNode ? (progress.nodeStatuses?.[matchNode.id] || "unknown") : "unknown";
                      return (
                        <li key={i} className="flex gap-3 items-start p-2.5 rounded-xl border border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/40 transition-colors group">
                          <span className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-500/5 text-teal-400 text-xs font-bold flex items-center justify-center font-mono">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-white text-sm font-medium">{item.label}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{item.reason}</p>
                          </div>
                          {matchNode && nodeStatus !== "known" && (
                            <button
                              onClick={() => { updateStatus(matchNode.id, "known"); toast(`"${item.label}" marked as known`, { type: "success", duration: 1500 }); }}
                              className="shrink-0 opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all font-medium">
                              ✓ Known
                            </button>
                          )}
                          {nodeStatus === "known" && (
                            <span className="shrink-0 text-[10px] text-emerald-400 font-medium">✓</span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : pathData?.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-2xl mb-2">🎉</p>
                  <p className="text-sm text-emerald-400 font-medium">All concepts mastered!</p>
                </div>
              ) : null
            )}

            {activePanel === "analytics" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Total", val: stats.total, cls: "text-white" },
                    { label: "Known", val: stats.known, cls: "text-emerald-400" },
                    { label: "Partial", val: stats.partial, cls: "text-amber-400" },
                    { label: "Unknown", val: stats.unknown, cls: "text-slate-400" },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
                      <div className={`text-xl font-display font-bold ${s.cls}`}>{s.val}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Overall mastery bar */}
                <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-700/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Overall Mastery</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {stats.total > 0 ? Math.round(((stats.known + stats.partial * 0.5) / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? Math.round(((stats.known + stats.partial * 0.5) / stats.total) * 100) : 0}%` }} />
                  </div>
                </div>

                <h4 className="text-xs text-white font-display font-semibold uppercase tracking-wider">Coverage by Depth</h4>
                {Object.entries(depthAnalytics).sort(([a],[b]) => a - b).map(([depth, d]) => {
                  const pct = d.total > 0 ? Math.round((d.known / d.total) * 100) : 0;
                  return (
                    <div key={depth} className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500 w-14 shrink-0 font-mono">Lvl {depth}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-400 w-16 text-right font-mono">{d.known}/{d.total}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLASHCARD PANEL */}
      {activePanel === "flashcards" && currentFlashcard && (
        <div className="mb-3 shrink-0 animate-scale-in">
          <div className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-display font-semibold text-sm">Flashcards <span className="text-slate-500 font-body font-normal">({flashIdx + 1}/{flashDeck.length})</span></h3>
                <p className="text-[10px] text-slate-600 mt-0.5">← → to navigate · Space to flip</p>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-[11px] text-slate-500 hover:text-white border border-slate-700 px-2 py-0.5 rounded-lg transition">Close</button>
            </div>
            <div
              onClick={() => setFlashFlipped(!flashFlipped)}
              className="relative cursor-pointer mx-auto max-w-lg h-48 sm:h-56 rounded-2xl border border-surface-border overflow-hidden transition-all duration-300 hover:shadow-xl"
              style={{ perspective: 800 }}>
              <div className="absolute inset-0 transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flashFlipped ? "rotateY(180deg)" : "" }}>
                {/* Front */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ backfaceVisibility: "hidden", background: "linear-gradient(135deg, var(--color-surface-card), var(--color-surface))" }}>
                  <span className={`text-xs px-2 py-0.5 rounded-full mb-3 ${STATUS_COLORS[currentFlashcard.status].badge}`}>{currentFlashcard.status}</span>
                  <h3 className="text-white font-display font-bold text-lg sm:text-xl">{currentFlashcard.label}</h3>
                  <p className="text-[11px] text-slate-500 mt-3">Click or press Space to reveal</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 overflow-y-auto" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "linear-gradient(135deg, #0c1222, #111827)" }}>
                  <p className="text-sm text-slate-300 leading-relaxed text-center">{currentFlashcard.description || "No description available."}</p>
                  {currentFlashcard.note && <p className="text-xs text-amber-400/70 italic mt-3 text-center">Note: {currentFlashcard.note}</p>}
                </div>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1 mt-3">
              {flashDeck.slice(Math.max(0, flashIdx - 4), flashIdx + 5).map((_, i) => {
                const realIdx = Math.max(0, flashIdx - 4) + i;
                return (
                  <button key={realIdx} onClick={() => { setFlashIdx(realIdx); setFlashFlipped(false); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${realIdx === flashIdx ? "bg-brand-400 w-3" : "bg-slate-700 hover:bg-slate-500"}`} />
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => { setFlashIdx(Math.max(0, flashIdx - 1)); setFlashFlipped(false); }} disabled={flashIdx === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-medium hover:border-slate-500 disabled:opacity-30 transition-all flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Prev
              </button>
              <button onClick={() => { cycleStatus(currentFlashcard.id); toast(`Marked as ${NEXT_STATUS[currentFlashcard.status]}`, { type: "info", duration: 1000 }); }}
                className="px-3 py-1.5 rounded-lg border border-brand-500/30 text-brand-400 text-xs font-medium hover:bg-brand-500/10 transition-all">Cycle Status</button>
              <button onClick={() => { setFlashIdx(Math.min(flashDeck.length - 1, flashIdx + 1)); setFlashFlipped(false); }} disabled={flashIdx >= flashDeck.length - 1}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-medium hover:border-slate-500 disabled:opacity-30 transition-all flex items-center gap-1">
                Next
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOCUS TIMER PANEL */}
      {activePanel === "timer" && (
        <div className="mb-3 shrink-0 animate-scale-in">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-display font-semibold text-sm">Focus Timer</h3>
              <button onClick={() => setActivePanel(null)} className="text-[11px] text-slate-500 hover:text-white border border-slate-700 px-2 py-0.5 rounded-lg transition">Close</button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
              {TIMER_PRESETS.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p)}
                  className={`px-3 py-1 text-[11px] rounded-lg border transition-all font-medium ${
                    timerPreset === p.id ? "border-brand-500 text-white bg-brand-500/10" : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                  }`}>
                  {p.label} <span className="opacity-60">{p.focus}/{p.break}</span>
                </button>
              ))}
              <button onClick={() => setTimerPreset("custom")}
                className={`px-3 py-1 text-[11px] rounded-lg border transition-all font-medium ${
                  timerPreset === "custom" ? "border-brand-500 text-white bg-brand-500/10" : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                }`}>
                Custom
              </button>
            </div>

            {timerPreset === "custom" && (
              <div className="flex items-center justify-center gap-3 mb-4 animate-view-in">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Focus</label>
                  <input type="number" min={1} max={120} value={customFocus}
                    onChange={(e) => setCustomFocus(Number(e.target.value) || 1)}
                    onBlur={() => applyCustomTimer(customFocus, customBreak)}
                    className="w-14 text-center text-sm bg-surface border border-slate-700 rounded-lg py-1 text-white font-mono focus:border-brand-500 focus:outline-none transition-colors" />
                  <span className="text-[10px] text-slate-500">min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Break</label>
                  <input type="number" min={1} max={30} value={customBreak}
                    onChange={(e) => setCustomBreak(Number(e.target.value) || 1)}
                    onBlur={() => applyCustomTimer(customFocus, customBreak)}
                    className="w-14 text-center text-sm bg-surface border border-slate-700 rounded-lg py-1 text-white font-mono focus:border-brand-500 focus:outline-none transition-colors" />
                  <span className="text-[10px] text-slate-500">min</span>
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                {timerMode === "focus" ? `Focus — ${customFocus}m` : `Break — ${customBreak}m`}
              </p>
              <div className={`text-5xl font-mono font-bold mb-4 tabular-nums ${timerMode === "focus" ? "text-white" : "text-emerald-400"}`}>{formatTimer(timerSeconds)}</div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={toggleTimer}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${timerRunning ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25" : "bg-brand-500 text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20"}`}>
                  {timerRunning ? "Pause" : "Start"}
                </button>
                <button onClick={() => { setTimerRunning(false); setTimerSeconds(timerMode === "focus" ? focusDuration : breakDuration); }}
                  className="px-4 py-2 rounded-xl text-sm border border-slate-700 text-slate-400 hover:border-slate-500 transition-all font-medium">
                  Reset
                </button>
                <button onClick={() => { const next = timerMode === "focus" ? "break" : "focus"; setTimerMode(next); setTimerSeconds(next === "focus" ? focusDuration : breakDuration); setTimerRunning(false); }}
                  className="px-4 py-2 rounded-xl text-sm border border-slate-700 text-slate-400 hover:border-slate-500 transition-all font-medium">
                  {timerMode === "focus" ? "→ Break" : "→ Focus"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTE MODAL */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setEditingNote(null)}>
          <div className="card p-5 w-full max-w-md space-y-3 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-display font-semibold">
              Note: <span className="text-brand-400">{nodes.find((n) => n.id === editingNote)?.label}</span>
            </h3>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write your notes here..." className="input !rounded-xl h-32 resize-none text-sm" autoFocus />
            <div className="flex gap-2 justify-between">
              {noteText && (
                <button onClick={() => setNoteText("")} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Clear</button>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setEditingNote(null)} className="btn-ghost text-sm py-2 px-4">Cancel</button>
                <button onClick={saveNodeNote} className="btn-primary text-sm py-2 px-4">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setDeleteConfirm(false)}>
          <div className="card p-6 w-full max-w-sm space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <div className="text-center">
              <h3 className="text-white font-display font-semibold">Delete "{topicMap?.topic}"?</h3>
              <p className="text-sm text-slate-400 mt-1">Your progress and notes will be permanently removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-surface-border text-sm text-slate-400 hover:text-white hover:bg-surface-hover transition-all font-medium">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="mb-2 shrink-0 border rounded-xl px-4 py-2.5 text-sm bg-red-500/10 border-red-500/30 text-red-400 animate-view-in flex items-center justify-between gap-3">
        {error}
        <button onClick={fetchMap} className="text-xs text-brand-400 hover:text-brand-300 transition-colors shrink-0">Retry</button>
      </div>}

      {/* CONTENT */}
      <div key={viewMode} className="animate-view-in flex-1 flex flex-col min-h-0">
        {viewMode === "list" && (
          <div className="space-y-2.5 overflow-y-auto pr-1">
            {!filteredNodes.length && (
              <div className="text-center py-16 space-y-2 animate-fade-in">
                <p className="text-slate-500 text-sm">{search || statusFilter !== "all" ? "No matching concepts" : "No concepts"}</p>
                {(search || statusFilter !== "all") && (
                  <button onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Clear filters</button>
                )}
              </div>
            )}
            {filteredNodes.map((node, idx) => {
              const status = progress.nodeStatuses?.[node.id] || "unknown";
              const sc = STATUS_COLORS[status];
              const nodeNote = progress.nodeNotes?.[node.id];

              return (
                <div key={node.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:translate-y-[-1px] animate-slide-up opacity-0 ${sc.border} ${sc.bg}`}
                  style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button onClick={() => cycleStatus(node.id)} className="mt-1 shrink-0" title={`Click: ${status} → ${NEXT_STATUS[status]}`}>
                        <span className={`text-sm transition-transform duration-200 hover:scale-125 inline-block ${status === "known" ? "text-emerald-400" : status === "partial" ? "text-amber-400" : "text-slate-500"}`}>{STATUS_ICON[status]}</span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-medium text-sm leading-snug">{node.label}</h3>
                        {node.description && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{node.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${sc.badge}`}>{status}</span>
                      {node.depth != null && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-500 font-mono">D{node.depth}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {STATUSES.map((s) => (
                      <button key={s} onClick={() => updateStatus(node.id, s)}
                        className={`px-2.5 py-0.5 text-[10px] rounded-lg border transition-all capitalize font-medium ${status === s ? STATUS_COLORS[s].active : "bg-transparent text-slate-500 border-slate-700 hover:border-slate-500"}`}>
                        {s}
                      </button>
                    ))}
                    <span className="flex-1" />
                    <button onClick={() => openNoteEditor(node.id)}
                      className={`px-2 py-0.5 text-[10px] rounded-lg border transition-all font-medium ${nodeNote ? "border-amber-500/30 text-amber-400 bg-amber-500/5" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}>
                      {nodeNote ? "✎ Note" : "+ Note"}
                    </button>
                    <button onClick={() => handleExplain(node)} disabled={explaining === node.id}
                      className={`px-2 py-0.5 text-[10px] rounded-lg border transition-all font-medium flex items-center gap-1 ${explanations[node.id] ? "border-brand-500 text-brand-400 bg-brand-500/10" : "border-sky-500/30 text-sky-400 hover:bg-sky-500/10"} disabled:opacity-50 disabled:cursor-wait`}>
                      {explaining === node.id ? <><span className="w-2.5 h-2.5 border-[1.5px] border-sky-400 border-t-transparent rounded-full animate-spin" />...</> : explanations[node.id] ? "Hide" : "Explain"}
                    </button>
                  </div>

                  {nodeNote && !explanations[node.id] && (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-300/70 italic leading-relaxed">{nodeNote}</div>
                  )}
                  {explanations[node.id] && (
                    <div className="mt-2.5 p-3 rounded-xl bg-sky-500/5 border border-sky-500/15 text-sm text-slate-300 leading-relaxed whitespace-pre-line">{explanations[node.id]}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "tree" && (
          <div className="overflow-y-auto pr-2 pl-1">
            {search.trim() && (
              <p className="text-xs text-slate-500 mb-3 px-1">
                Showing results for "<span className="text-brand-400">{search}</span>"
              </p>
            )}
            {renderTree(buildTree())}
          </div>
        )}

        {viewMode === "graph" && (
          <div className="flex-1 w-full min-h-[400px] rounded-2xl overflow-hidden border border-surface-border">
            <Suspense fallback={<div className="flex items-center justify-center h-64"><Spinner /></div>}>
              <ReactFlow
                nodes={graphNodes} edges={graphEdges} nodeTypes={NODE_TYPES}
                fitView className="bg-[#020617]"
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{ type: "smoothstep" }}
                minZoom={0.3} maxZoom={2}>
                <Background color="#1e293b" gap={24} size={1} />
                <Controls position="bottom-right" />
                <MiniMap nodeColor={(n) => {
                  const s = progress.nodeStatuses?.[n.id] || "unknown";
                  return s === "known" ? "#10b981" : s === "partial" ? "#f59e0b" : "#334155";
                }} maskColor="rgba(0,0,0,0.7)" style={{ borderRadius: 12 }} />
              </ReactFlow>
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
