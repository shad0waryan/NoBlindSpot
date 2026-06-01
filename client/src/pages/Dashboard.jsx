import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { mapsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner, Alert, ProgressRing, EmptyState } from "../components/ui";
import { APP_CONFIG } from "../config/appConfig";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "most", label: "Most Complete" },
  { key: "least", label: "Least Complete" },
];

const SUGGESTED_TOPICS = [
  "Machine Learning",
  "React",
  "Data Structures",
  "System Design",
  "Python",
  "Docker",
  "Kubernetes",
  "GraphQL",
  "SQL",
  "Cybersecurity",
  "Blockchain",
  "Computer Networks",
  "Operating Systems",
  "Web Security",
  "TypeScript",
  "Next.js",
  "Redis",
  "PostgreSQL",
  "Rust",
  "Go",
  "Linear Algebra",
  "Statistics",
  "Deep Learning",
  "NLP",
  "Computer Vision",
];

function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

let _recents = [];
function getRecents() {
  return _recents;
}
function addRecent(topic) {
  _recents = [
    topic,
    ..._recents.filter((t) => t.toLowerCase() !== topic.toLowerCase()),
  ].slice(0, 8);
}

const SkeletonCard = () => (
  <div className="card p-5 animate-pulse">
    <div className="flex items-start gap-3.5">
      <div className="w-[50px] h-[50px] rounded-full bg-surface-hover" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 bg-surface-hover rounded-lg w-3/4" />
        <div className="h-3 bg-surface-hover rounded-lg w-1/2" />
      </div>
    </div>
    <div className="h-3 bg-surface-hover rounded-lg w-1/3 mt-3" />
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchMaps = async () => {
    try {
      const { data } = await mapsAPI.getAll();
      setMaps(data.progress || []);
    } catch {
      setError("Failed to load your maps.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = `Dashboard — ${APP_CONFIG.name}`;
    fetchMaps();
    const handleFocus = () => fetchMaps();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      searchRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    const t = topic.trim();
    if (!t) return;
    setError("");
    setGenerating(true);
    setShowSuggestions(false);
    try {
      const { data } = await mapsAPI.generate(t);
      addRecent(t);
      toast("Map generated!", { type: "success" });
      navigate(`/map/${data.topicMap._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate map.");
      setGenerating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await mapsAPI.delete(deleteTarget);
      setMaps((prev) => prev.filter((m) => m.topicMap._id !== deleteTarget));
      toast("Map deleted", { type: "success" });
    } catch {
      toast("Failed to delete map", { type: "error" });
    }
    setDeleteTarget(null);
  };

  const filteredMaps = useMemo(() => {
    let result = maps;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((m) =>
        m.topicMap?.topic?.toLowerCase().includes(q),
      );
    }
    result = [...result].sort((a, b) => {
      const pctA = a.stats?.total
        ? (a.stats.known + a.stats.partial * 0.5) / a.stats.total
        : 0;
      const pctB = b.stats?.total
        ? (b.stats.known + b.stats.partial * 0.5) / b.stats.total
        : 0;
      switch (sort) {
        case "oldest":
          return new Date(a.updatedAt) - new Date(b.updatedAt);
        case "most":
          return pctB - pctA;
        case "least":
          return pctA - pctB;
        default:
          return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
    return result;
  }, [maps, search, sort]);

  const globalStats = useMemo(() => {
    let totalConcepts = 0,
      totalKnown = 0,
      totalPartial = 0,
      totalUnknown = 0;
    maps.forEach((m) => {
      totalConcepts += m.stats?.total || 0;
      totalKnown += m.stats?.known || 0;
      totalPartial += m.stats?.partial || 0;
      totalUnknown += m.stats?.unknown || 0;
    });
    const mastery =
      totalConcepts > 0
        ? Math.round(((totalKnown + totalPartial * 0.5) / totalConcepts) * 100)
        : 0;
    return {
      maps: maps.length,
      concepts: totalConcepts,
      known: totalKnown,
      partial: totalPartial,
      unknown: totalUnknown,
      mastery,
    };
  }, [maps]);

  // Most recently accessed map (for "jump back in")
  const recentMap = useMemo(() => {
    if (!maps.length) return null;
    return [...maps].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    )[0];
  }, [maps]);

  const recentTopics = getRecents();
  const suggestions = topic.trim()
    ? SUGGESTED_TOPICS.filter(
        (s) =>
          s.toLowerCase().includes(topic.trim().toLowerCase()) &&
          s.toLowerCase() !== topic.trim().toLowerCase(),
      ).slice(0, 5)
    : [
        ...recentTopics.slice(0, 3),
        ...SUGGESTED_TOPICS.filter((s) => !recentTopics.includes(s)).slice(
          0,
          5,
        ),
      ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const greetingEmoji =
    new Date().getHours() < 12
      ? "☀️"
      : new Date().getHours() < 17
        ? "🌤️"
        : "🌙";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Greeting */}
      <div className="mb-8 sm:mb-10 animate-slide-up">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl sm:text-4xl capitalize tracking-tight">
            <span className="font-serif italic font-medium text-white">
              {greeting},
            </span>{" "}
            <span className="font-display font-bold text-white">
              {user?.name?.split(" ")[0]}
            </span>
          </h1>
          <span className="text-2xl sm:text-3xl animate-float">
            {greetingEmoji}
          </span>
        </div>
        <p className="text-slate-400 text-sm sm:text-base font-body">
          {APP_CONFIG.tagline}
        </p>
      </div>

      {/* Global Stats */}
      {!loading && maps.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-slide-up opacity-0 stagger-1">
          {[
            {
              label: "Maps",
              value: globalStats.maps,
              icon: "🗺️",
              color: "text-brand-400",
              sub: "topics mapped",
            },
            {
              label: "Concepts",
              value: globalStats.concepts,
              icon: "🧩",
              color: "text-violet-400",
              sub: `${globalStats.unknown} gaps left`,
            },
            {
              label: "Mastered",
              value: globalStats.known,
              icon: "✓",
              color: "text-emerald-400",
              sub: `${globalStats.partial} partial`,
            },
            {
              label: "Mastery",
              value: `${globalStats.mastery}%`,
              icon: "📈",
              color: "text-amber-400",
              sub: "overall progress",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="card px-4 py-3.5 flex items-center gap-3 group hover:border-slate-600 transition-colors"
            >
              <span className="text-lg">{s.icon}</span>
              <div>
                <p className={`text-lg font-display font-bold ${s.color}`}>
                  {s.value}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                  {s.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Jump Back In */}
      {!loading && recentMap && (
        <div className="mb-5 animate-slide-up opacity-0 stagger-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
            Jump back in
          </p>
          <button
            onClick={() => navigate(`/map/${recentMap.topicMap._id}`)}
            className="w-full sm:w-auto flex items-center gap-4 card px-5 py-3.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5 transition-all group text-left"
          >
            <ProgressRing
              known={recentMap.stats?.known || 0}
              partial={recentMap.stats?.partial || 0}
              total={recentMap.stats?.total || 0}
              size={44}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-display font-semibold capitalize text-sm group-hover:text-brand-400 transition-colors truncate">
                {recentMap.topicMap?.topic}
              </p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                {recentMap.stats?.unknown > 0
                  ? `${recentMap.stats.unknown} concept${recentMap.stats.unknown !== 1 ? "s" : ""} left to learn`
                  : "Fully mastered!"}
                {" · "}
                {relativeTime(recentMap.updatedAt)}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Generate Card */}
      <div className="card p-5 sm:p-6 mb-6 sm:mb-8 animate-slide-up opacity-0 stagger-2 relative isolate z-20">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 via-transparent to-violet-500/5 pointer-events-none rounded-2xl" />
        <div className="relative">
          <h2 className="text-white font-display font-semibold mb-1">
            Generate a Knowledge Map
          </h2>
          <p className="text-slate-500 text-xs mb-3">
            Enter any topic and our AI will map out everything you need to learn
          </p>

          <Alert type="error" message={error} />

          <form
            onSubmit={handleGenerate}
            className="flex flex-col sm:flex-row gap-3 mt-2"
          >
            <div className="relative flex-1 z-20">
              <input
                className="input flex-1"
                placeholder="e.g. React, DBMS, Machine Learning..."
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                disabled={generating}
                maxLength={200}
              />
              {showSuggestions && suggestions.length > 0 && !generating && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-surface-border bg-surface-card p-1.5 z-50 max-h-52 overflow-y-auto animate-scale-in origin-top shadow-2xl shadow-black/40">
                  {recentTopics.length > 0 && !topic.trim() && (
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider px-3 py-1 font-medium">
                      Recent
                    </p>
                  )}
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTopic(s);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-surface-hover hover:text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      {recentTopics.includes(s) && !topic.trim() ? (
                        <svg
                          className="w-3 h-3 text-slate-500 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-3 h-3 text-slate-500 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      )}
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              disabled={generating || !topic.trim()}
              className={`px-6 py-2.5 rounded-xl font-display font-semibold flex items-center justify-center gap-2
                transition-all duration-300 whitespace-nowrap text-sm
                ${
                  generating || !topic.trim()
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-400 hover:to-brand-500 active:scale-[0.97] shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40"
                }`}
            >
              {generating ? (
                <>
                  <Spinner size="sm" />
                  <span className="animate-pulse">
                    {topic.trim()
                      ? `Mapping "${topic.trim()}"...`
                      : "Generating..."}
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Generate
                </>
              )}
            </button>
          </form>

          {!topic.trim() && !generating && (
            <div
              className={`flex flex-wrap gap-1.5 mt-3 transition-opacity duration-200 ${showSuggestions ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              {SUGGESTED_TOPICS.slice(0, 10).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="px-2.5 py-1 text-[13px] rounded-lg border border-surface-border text-slate-500 hover:text-white hover:border-brand-500/40 hover:bg-brand-500/5 transition-all duration-200 font-medium"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="mb-4 space-y-3 animate-slide-up opacity-0 stagger-3 relative z-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-white text-lg font-display font-semibold">
            Your Maps
            <span className="text-slate-500 font-body font-normal text-sm ml-2">
              ({filteredMaps.length})
            </span>
          </h2>

          {maps.length > 0 && (
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search maps…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm !rounded-lg w-full sm:w-56"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              {!search && (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-500 font-mono">
                  ⌘K
                </kbd>
              )}
            </div>
          )}
        </div>

        {maps.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`px-3 py-1 text-xs rounded-lg border transition-all duration-200 font-medium ${
                  sort === opt.key
                    ? "border-brand-500 text-white bg-brand-500/10 shadow-sm shadow-brand-500/10"
                    : "border-surface-border text-slate-400 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Maps Grid */}
      <div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : maps.length === 0 ? (
          <div className="animate-scale-in">
            <EmptyState
              icon={
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-brand-500/15 to-violet-500/10 border border-brand-500/20 flex items-center justify-center animate-float">
                  <svg
                    className="w-10 h-10 text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
              }
              title="No maps yet"
              description="Enter a topic above and generate your first knowledge map to start tracking what you know."
            />
          </div>
        ) : filteredMaps.length === 0 ? (
          <div className="text-center py-12 space-y-2 animate-fade-in">
            <p className="text-slate-400 text-sm">No maps match "{search}"</p>
            <button
              onClick={() => setSearch("")}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMaps.map((map, i) => {
              const pct = map.stats?.total
                ? Math.round(
                    ((map.stats.known + map.stats.partial * 0.5) /
                      map.stats.total) *
                      100,
                  )
                : 0;
              const isMastered = pct === 100;
              const isRecent = recentMap?._id === map._id;
              return (
                <div
                  key={map._id}
                  className={`card p-5 cursor-pointer hover:scale-[1.02] hover:shadow-xl group relative animate-slide-up opacity-0 stagger-${Math.min(i + 1, 6)} transition-all duration-200
                    ${isRecent ? "border-brand-500/20 hover:border-brand-500/40" : "hover:border-slate-600"}`}
                  onClick={() => navigate(`/map/${map.topicMap._id}`)}
                >
                  {isRecent && (
                    <div className="absolute top-3 left-3">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/20 font-medium">
                        Recent
                      </span>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(map.topicMap._id);
                    }}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg border border-transparent
                               text-slate-600 opacity-0 group-hover:opacity-100
                               hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10
                               transition-all duration-200 flex items-center justify-center text-xs"
                    title="Delete"
                  >
                    ✕
                  </button>

                  <div
                    className={`flex items-start gap-3.5 ${isRecent ? "mt-5" : ""}`}
                  >
                    <ProgressRing
                      known={map.stats?.known || 0}
                      partial={map.stats?.partial || 0}
                      total={map.stats?.total || 0}
                      size={50}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-display font-semibold capitalize line-clamp-2 mb-1 group-hover:text-brand-400 transition-colors duration-200">
                        {map.topicMap?.topic}
                      </h3>
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1" title="Known">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {map.stats?.known || 0}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          title="Partial"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {map.stats?.partial || 0}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          title="Unknown"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          {map.stats?.unknown || 0}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span>{map.stats?.total || 0} total</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="mt-3 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background:
                          pct === 100
                            ? "#10b981"
                            : pct > 50
                              ? "linear-gradient(90deg,#10b981,#f59e0b)"
                              : "#3b82f6",
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[13px] text-slate-500 font-mono">
                      {relativeTime(map.updatedAt)}
                    </span>
                    {isMastered ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/20">
                        Mastered
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono">
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="card p-6 w-full max-w-sm space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-white font-display font-semibold">
                Delete this map?
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Your progress and notes for this map will be permanently
                removed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-surface-border text-sm text-slate-400 hover:text-white hover:bg-surface-hover transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
