import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import {
  Lightbulb, ChevronDown, ChevronUp, Loader2, Trash2,
  AlertTriangle, Check, Target, Layers, Megaphone,
  Star, FileText, Palette, TrendingUp, ArrowRight, RefreshCw,
  Sparkles, Send, Edit2, Plus
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface StrategyPlan { id: string; company_name: string; industry: string; user_prompt: string; created_at: string; }
interface ContentCategory { category: string; description: string; goal: string; }
interface ContentIdea {
  title: string; category: string; description: string;
  formats: string[]; platforms: string[];
  priority: "High" | "Medium" | "Low";
  impact: string; caption_hook: string;
}
interface ToneStyle { tone: string; style: string; voice: string; dos: string[]; donts: string[]; content_pillars: string[]; }
interface ContentResult {
  id: string; plan_id: string; plan_name: string; industry: string; created_at: string;
  result: {
    overview: string; target_audience: string;
    content_categories: ContentCategory[];
    content_ideas: ContentIdea[];
    tone_style: ToneStyle;
  };
}

const PRIORITY_STYLE: Record<string, string> = {
  High:   "bg-primary-600/10 text-primary-600 border border-primary-600/20",
  Medium: "bg-[#F6AD55]/10 text-[#D97706] border border-[#F6AD55]/20",
  Low:    "bg-[#A0AEC0]/10 text-slate-500 border border-[#A0AEC0]/20",
};

const FORMAT_ICONS: Record<string, string> = {
  Reel:"🎬", Video:"📹", Blog:"📝", Post:"📸", Story:"⭕", Carousel:"🎠",
  Ad:"💰", Email:"📧", Podcast:"🎙️", Infographic:"📊"
};

const PLATFORM_COLORS: Record<string, string> = {
  Instagram:"text-pink-500", LinkedIn:"text-blue-600", YouTube:"text-danger",
  Twitter:"text-sky-500", Facebook:"text-blue-700", "Google Ads":"text-yellow-600",
  Email:"text-green-600", TikTok:"text-black"
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContentIdeasPage() {
  const [plans, setPlans]                   = useState<StrategyPlan[]>([]);
  const [results, setResults]               = useState<ContentResult[]>([]);
  const [selectedPlan, setSelectedPlan]     = useState<string>("");
  const [loading, setLoading]               = useState(true);
  const [generating, setGenerating]         = useState(false);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<"ideas"|"categories"|"tone">("ideas");
  const [refinementFeedback, setRefinementFeedback] = useState("");
  const [refining, setRefining]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  // Editing State
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editingResultData, setEditingResultData] = useState<ContentResult['result'] | null>(null);
  const [saving, setSaving] = useState(false);

  const startEditing = (record: ContentResult) => {
    setEditingResultId(record.id);
    setEditingResultData(JSON.parse(JSON.stringify(record.result)));
  };

  const handleSave = async (resultId: string) => {
    if (!token || !editingResultData) return;
    setSaving(true);
    try {
      const record = results.find(r => r.id === resultId);
      const requestData = {
        result: {
          ...editingResultData,
          industry: record?.industry || "",
          plan_name: record?.plan_name || "",
        }
      };

      const res = await fetch(
        `http://localhost:8000/agent/content-ideas/${resultId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setResults(prev => prev.map(r => r.id === resultId ? data.data : r));
        setEditingResultId(null);
        setEditingResultData(null);
      } else {
        alert(data.detail || "Saving changes failed.");
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("Connection error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleRefine = async (resultId: string) => {
    if (!token || !refinementFeedback.trim()) return;
    setRefining(true);
    try {
      const res = await fetch(
        `http://localhost:8000/agent/content-ideas/${resultId}/refine`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ feedback: refinementFeedback }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setResults(prev => prev.map(r => r.id === resultId ? data.data : r));
        setRefinementFeedback("");
      } else {
        alert(data.detail || "Refinement failed.");
      }
    } catch (err) {
      console.error("Refinement failed:", err);
      alert("Refinement connection error.");
    } finally {
      setRefining(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    if (!token) { navigate("/auth"); return; }
    setLoading(true); setError(null);
    try {
      const [plansRes, resultsRes] = await Promise.all([
        fetch("http://localhost:8000/agent/plans",         { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:8000/agent/content-ideas", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const plansData   = await plansRes.json();
      const resultsData = await resultsRes.json();
      if (plansData.success)   setPlans(plansData.data);
      if (resultsData.success) setResults(resultsData.data);
    } catch (e) { setError("Failed to load data."); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!selectedPlan || !token) return;
    setGenerating(true); setError(null);
    try {
      const res  = await fetch("http://localhost:8000/agent/agents/content_ideas_agent/execute", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Generate content ideas", plan_id: selectedPlan })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchAll();
        setExpandedId(null);
      } else {
        setError(data.detail || "Generation failed.");
      }
    } catch (e) { setError("Connection error. Is the server running?"); }
    finally { setGenerating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:8000/agent/content-ideas/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { setResults(prev => prev.filter(r => r.id !== id)); if (expandedId === id) setExpandedId(null); }
    } finally { setDeletingId(null); setConfirmDeleteId(null); }
  };

  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString("en-IN", { day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit" }); } catch { return iso; } };

  const TABS = [
    { key: "ideas"      as const, label: "Content Ideas",   icon: Lightbulb },
    { key: "categories" as const, label: "Categories",      icon: Layers },
    { key: "tone"       as const, label: "Tone & Style",    icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NavigationBar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">

        {/* Header */}
        <header className="mb-10 flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
              <Lightbulb size={24} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">Content Ideas</h1>
              <p className="text-slate-500 font-medium text-sm mt-0.5">
                AI-generated content ideas based on your strategy plans.
              </p>
            </div>
          </div>
          <button onClick={fetchAll} className="inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-bold text-slate-500">
            <RefreshCw size={15} /> Refresh
          </button>
        </header>

        {/* Generator Panel */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-7 mb-8">
          <h2 className="font-extrabold text-lg mb-5 flex items-center gap-2">
            <Target size={18} className="text-primary-600" /> Generate New Content Ideas
          </h2>
          {error && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl px-4 py-3 mb-4 text-sm font-medium text-danger flex items-center gap-2">
              <AlertTriangle size={15} />{error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              className="flex-1 bg-slate-100 border border-slate-200 shadow-inner rounded-xl bg-transparent rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all"
              disabled={generating}
            >
              <option value="">Select a strategy plan…</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.company_name} · {p.industry} · {fmt(p.created_at)}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={!selectedPlan || generating}
              className="inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl px-7 py-3 font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generating
                ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                : <><Lightbulb size={16} /> Generate Ideas<ArrowRight size={15} /></>
              }
            </button>
          </div>
          {plans.length === 0 && !loading && (
            <p className="text-xs text-slate-400 mt-3 font-medium">
              No strategy plans found. Run the Strategy Agent first to create a plan.
            </p>
          )}
          {generating && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl rounded-2xl px-4 py-3 text-sm font-medium text-primary-600 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              AI is analyzing your plan and generating content ideas… this takes ~60 seconds.
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 size={36} className="animate-spin text-primary-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-[28px] p-16 text-center">
            <Lightbulb size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500 font-bold text-lg">No content ideas generated yet.</p>
            <p className="text-slate-400 text-sm mt-1">Select a plan above and click "Generate Ideas".</p>
          </div>
        ) : (
          <div className="space-y-5">
            {results.map(record => {
              const isExpanded   = expandedId === record.id;
              const isConfirming = confirmDeleteId === record.id;
              const isDeleting   = deletingId === record.id;
              const highCount    = record.result?.content_ideas?.filter(i => i.priority === "High").length ?? 0;

              return (
                <div key={record.id} className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] overflow-hidden transition-all duration-300">
                  {/* ── Row Header ── */}
                  <div className="flex items-center gap-4 px-6 py-5">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={20} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-extrabold text-lg">{record.plan_name}</h3>
                        <span className="px-3 py-1 bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-full text-xs font-bold text-primary-600">{record.industry}</span>
                        {highCount > 0 && (
                          <span className="px-2 py-1 bg-primary-600/10 border border-primary-600/20 text-primary-600 rounded-full text-xs font-bold flex items-center gap-1">
                            <Star size={10} fill="currentColor" /> {highCount} High-Impact
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mt-0.5 font-medium">{fmt(record.created_at)}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0 text-xs font-bold text-slate-500">
                      <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-full">
                        {record.result?.content_ideas?.length ?? 0} ideas
                      </span>
                      <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-full">
                        {record.result?.content_categories?.length ?? 0} categories
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-danger font-bold flex items-center gap-1"><AlertTriangle size={12} />Delete?</span>
                          <button onClick={() => handleDelete(record.id)} disabled={isDeleting}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1">
                            {isDeleting && <Loader2 size={12} className="animate-spin" />} Yes
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(record.id)}
                          className="w-9 h-9 flex items-center justify-center inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-red-400 transition-all" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      )}
                      <button onClick={() => { setExpandedId(isExpanded ? null : record.id); setActiveTab("ideas"); }}
                        className="w-9 h-9 flex items-center justify-center inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl transition-all">
                        {isExpanded ? <ChevronUp size={16} className="text-primary-600" /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded Panel ── */}
                  {isExpanded && (
                    <div className="border-t border-[#d0d7e3] px-6 pb-7 pt-5">

                      {/* Overview strip */}
                      {editingResultId === record.id && editingResultData ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl px-5 py-4 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Objective</div>
                            <textarea
                              value={editingResultData.overview || ""}
                              onChange={e => setEditingResultData({ ...editingResultData, overview: e.target.value })}
                              className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-1 text-sm font-medium leading-relaxed resize-none text-slate-900"
                              rows={2}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Target Audience</div>
                            <textarea
                              value={editingResultData.target_audience || ""}
                              onChange={e => setEditingResultData({ ...editingResultData, target_audience: e.target.value })}
                              className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-1 text-sm font-medium leading-relaxed resize-none text-slate-900"
                              rows={2}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl px-5 py-4 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Objective</div>
                            <p className="text-sm font-medium leading-relaxed">{record.result?.overview || "—"}</p>
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Target Audience</div>
                            <p className="text-sm font-medium leading-relaxed">{record.result?.target_audience || "—"}</p>
                          </div>
                        </div>
                      )}

                      {/* Tab Bar and Edit Button */}
                      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <div className="flex gap-2 flex-wrap">
                          {TABS.map(({ key, label, icon: Icon }) => (
                            <button
                              key={key}
                              onClick={() => setActiveTab(key)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === key
                                  ? "inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                                  : "inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                              }`}
                            >
                              <Icon size={14} />
                              {label}
                            </button>
                          ))}
                        </div>

                        <div>
                          {editingResultId === record.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSave(record.id)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                Save Changes
                              </button>
                              <button
                                onClick={() => { setEditingResultId(null); setEditingResultData(null); }}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 text-gray-500 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(record)}
                              className="flex items-center gap-1.5 px-4 py-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 text-primary-600 rounded-xl text-xs font-bold transition-all"
                            >
                              <Edit2 size={13} />
                              Edit Ideas
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ── IDEAS TAB ── */}
                      {activeTab === "ideas" && (
                        editingResultId === record.id && editingResultData ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {(editingResultData.content_ideas || []).map((idea, i) => (
                              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5 space-y-3 relative">
                                {/* Title + Priority + Delete */}
                                <div className="flex items-start justify-between gap-2">
                                  <input
                                    type="text"
                                    value={idea.title}
                                    onChange={(e) => {
                                      const updated = [...editingResultData.content_ideas];
                                      updated[i] = { ...idea, title: e.target.value };
                                      setEditingResultData({ ...editingResultData, content_ideas: updated });
                                    }}
                                    className="flex-1 bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-sm font-extrabold text-slate-900"
                                    placeholder="Idea Title"
                                  />
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <select
                                      value={idea.priority}
                                      onChange={(e) => {
                                        const updated = [...editingResultData.content_ideas];
                                        updated[i] = { ...idea, priority: e.target.value as "High" | "Medium" | "Low" };
                                        setEditingResultData({ ...editingResultData, content_ideas: updated });
                                      }}
                                      className="bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 text-xs font-bold py-0.5 text-slate-900"
                                    >
                                      <option value="High">High</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Low">Low</option>
                                    </select>
                                    <button
                                      onClick={() => {
                                        const updated = editingResultData.content_ideas.filter((_, idx) => idx !== i);
                                        setEditingResultData({ ...editingResultData, content_ideas: updated });
                                      }}
                                      className="p-1 hover:text-danger transition-colors"
                                      title="Delete Idea"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>

                                {/* Category */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Category:</span>
                                  <select
                                    value={idea.category}
                                    onChange={(e) => {
                                      const updated = [...editingResultData.content_ideas];
                                      updated[i] = { ...idea, category: e.target.value };
                                      setEditingResultData({ ...editingResultData, content_ideas: updated });
                                    }}
                                    className="bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 text-xs font-bold text-slate-500 py-0.5"
                                  >
                                    {editingResultData.content_categories.map(cat => (
                                      <option key={cat.category} value={cat.category}>{cat.category}</option>
                                    ))}
                                    {!editingResultData.content_categories.some(c => c.category === idea.category) && (
                                      <option value={idea.category}>{idea.category}</option>
                                    )}
                                  </select>
                                </div>

                                {/* Description */}
                                <div>
                                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Description</div>
                                  <textarea
                                    value={idea.description}
                                    onChange={(e) => {
                                      const updated = [...editingResultData.content_ideas];
                                      updated[i] = { ...idea, description: e.target.value };
                                      setEditingResultData({ ...editingResultData, content_ideas: updated });
                                    }}
                                    className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-xs text-slate-500 font-medium leading-relaxed resize-none"
                                    rows={3}
                                    placeholder="Idea description..."
                                  />
                                </div>

                                {/* Caption hook */}
                                <div className="bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-xl px-3 py-2">
                                  <div className="text-[10px] font-extrabold text-primary-600 uppercase tracking-wider mb-1">Caption Hook</div>
                                  <input
                                    type="text"
                                    value={idea.caption_hook}
                                    onChange={(e) => {
                                      const updated = [...editingResultData.content_ideas];
                                      updated[i] = { ...idea, caption_hook: e.target.value };
                                      setEditingResultData({ ...editingResultData, content_ideas: updated });
                                    }}
                                    className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-xs font-medium text-slate-900 italic"
                                    placeholder="Caption Hook..."
                                  />
                                </div>

                                {/* Formats Selection */}
                                <div>
                                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Formats</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {["Post", "Reel", "Blog", "Ad", "Video", "Story", "Carousel", "Email", "Podcast", "Infographic"].map(f => {
                                      const isSelected = idea.formats.includes(f);
                                      return (
                                        <button
                                          key={f}
                                          type="button"
                                          onClick={() => {
                                            const newFormats = isSelected
                                              ? idea.formats.filter(item => item !== f)
                                              : [...idea.formats, f];
                                            const updated = [...editingResultData.content_ideas];
                                            updated[i] = { ...idea, formats: newFormats };
                                            setEditingResultData({ ...editingResultData, content_ideas: updated });
                                          }}
                                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                            isSelected
                                              ? "bg-primary-600 text-white"
                                              : "bg-slate-50 border border-slate-200 shadow-inner rounded-md text-slate-900"
                                          }`}
                                        >
                                          {FORMAT_ICONS[f] || "📌"} {f}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Platforms Selection */}
                                <div>
                                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Platforms</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {["Instagram", "LinkedIn", "YouTube", "Twitter", "Facebook", "Google Ads", "Email", "TikTok"].map(p => {
                                      const isSelected = idea.platforms.includes(p);
                                      return (
                                        <button
                                          key={p}
                                          type="button"
                                          onClick={() => {
                                            const newPlatforms = isSelected
                                              ? idea.platforms.filter(item => item !== p)
                                              : [...idea.platforms, p];
                                            const updated = [...editingResultData.content_ideas];
                                            updated[i] = { ...idea, platforms: newPlatforms };
                                            setEditingResultData({ ...editingResultData, content_ideas: updated });
                                          }}
                                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                            isSelected
                                              ? "bg-primary-600 text-white"
                                              : "bg-slate-50 border border-slate-200 shadow-inner rounded-md text-slate-900"
                                          }`}
                                        >
                                          {p}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Impact */}
                                <div>
                                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Expected Impact</div>
                                  <div className="flex items-center gap-2 text-xs text-[#38B2AC] font-semibold">
                                    <TrendingUp size={13} className="flex-shrink-0" />
                                    <input
                                      type="text"
                                      value={idea.impact}
                                      onChange={(e) => {
                                        const updated = [...editingResultData.content_ideas];
                                        updated[i] = { ...idea, impact: e.target.value };
                                        setEditingResultData({ ...editingResultData, content_ideas: updated });
                                      }}
                                      className="flex-1 bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-xs text-[#38B2AC] font-semibold"
                                      placeholder="Expected Impact"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="col-span-full flex justify-center mt-4">
                              <button
                                onClick={() => {
                                  const newIdea: ContentIdea = {
                                    title: "New Content Idea",
                                    category: editingResultData.content_categories[0]?.category || "General",
                                    description: "",
                                    formats: ["Post"],
                                    platforms: ["Instagram"],
                                    priority: "Medium",
                                    impact: "Increase brand engagement",
                                    caption_hook: ""
                                  };
                                  setEditingResultData({
                                    ...editingResultData,
                                    content_ideas: [...editingResultData.content_ideas, newIdea]
                                  });
                                }}
                                className="inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl px-5 py-2.5 font-bold text-xs flex items-center gap-1.5"
                              >
                                <Plus size={14} /> Add Content Idea
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {(record.result?.content_ideas || []).map((idea, i) => (
                              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5 space-y-3">
                                {/* Title + Priority */}
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-extrabold text-sm leading-tight flex-1">{idea.title}</h4>
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold flex-shrink-0 ${PRIORITY_STYLE[idea.priority] || PRIORITY_STYLE.Low}`}>
                                    {idea.priority}
                                  </span>
                                </div>

                                {/* Category */}
                                <span className="inline-block px-2 py-1 bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-lg text-xs font-bold text-slate-500">
                                  {idea.category}
                                </span>

                                {/* Description */}
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{idea.description}</p>

                                {/* Caption hook */}
                                {idea.caption_hook && (
                                  <div className="bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-xl px-3 py-2">
                                    <div className="text-[10px] font-extrabold text-primary-600 uppercase tracking-wider mb-1">Caption Hook</div>
                                    <p className="text-xs font-medium text-slate-900 italic">"{idea.caption_hook}"</p>
                                  </div>
                                )}

                                {/* Formats */}
                                <div>
                                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Formats</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {idea.formats.map((f, j) => (
                                      <span key={j} className="px-2 py-1 bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-lg text-[10px] font-bold text-slate-900">
                                        {FORMAT_ICONS[f] || "📌"} {f}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Platforms */}
                                <div>
                                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Platforms</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {idea.platforms.map((p, j) => (
                                      <span key={j} className={`text-[11px] font-extrabold ${PLATFORM_COLORS[p] || "text-slate-500"}`}>
                                        {p}{j < idea.platforms.length - 1 ? " ·" : ""}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Impact */}
                                <div className="flex items-start gap-2 text-xs text-[#38B2AC] font-semibold">
                                  <TrendingUp size={13} className="flex-shrink-0 mt-0.5" />{idea.impact}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}

                      {/* ── CATEGORIES TAB ── */}
                      {activeTab === "categories" && (
                        editingResultId === record.id && editingResultData ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(editingResultData.content_categories || []).map((cat, i) => (
                              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 shadow-inner rounded-md flex items-center justify-center text-primary-600 text-xs font-extrabold">{i + 1}</span>
                                    <input
                                      type="text"
                                      value={cat.category}
                                      onChange={(e) => {
                                        const updated = [...editingResultData.content_categories];
                                        updated[i] = { ...cat, category: e.target.value };
                                        setEditingResultData({ ...editingResultData, content_categories: updated });
                                      }}
                                      className="bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-sm font-extrabold text-slate-900"
                                      placeholder="Category Name"
                                    />
                                  </div>
                                  <button
                                    onClick={() => {
                                      const updated = editingResultData.content_categories.filter((_, idx) => idx !== i);
                                      setEditingResultData({ ...editingResultData, content_categories: updated });
                                    }}
                                    className="p-1 hover:text-danger transition-colors"
                                    title="Delete Category"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div>
                                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Description</div>
                                  <textarea
                                    value={cat.description}
                                    onChange={(e) => {
                                      const updated = [...editingResultData.content_categories];
                                      updated[i] = { ...cat, description: e.target.value };
                                      setEditingResultData({ ...editingResultData, content_categories: updated });
                                    }}
                                    className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-xs text-slate-500 font-medium leading-relaxed resize-none"
                                    rows={2}
                                    placeholder="Category Description..."
                                  />
                                </div>
                                <div className="flex items-start gap-1.5 text-xs text-primary-600 font-semibold">
                                  <Target size={11} className="mt-1 flex-shrink-0" />
                                  <input
                                    type="text"
                                    value={cat.goal}
                                    onChange={(e) => {
                                      const updated = [...editingResultData.content_categories];
                                      updated[i] = { ...cat, goal: e.target.value };
                                      setEditingResultData({ ...editingResultData, content_categories: updated });
                                    }}
                                    className="flex-1 bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-xs text-primary-600 font-semibold"
                                    placeholder="Category Goal"
                                  />
                                </div>
                              </div>
                            ))}
                            <div className="col-span-full flex justify-center mt-4">
                              <button
                                onClick={() => {
                                  const newCat: ContentCategory = {
                                    category: "New Category",
                                    description: "",
                                    goal: ""
                                  };
                                  setEditingResultData({
                                    ...editingResultData,
                                    content_categories: [...editingResultData.content_categories, newCat]
                                  });
                                }}
                                className="inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl px-5 py-2.5 font-bold text-xs flex items-center gap-1.5"
                              >
                                <Plus size={14} /> Add Category
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(record.result?.content_categories || []).map((cat, i) => (
                              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 shadow-inner rounded-md flex items-center justify-center text-primary-600 text-xs font-extrabold">{i + 1}</span>
                                  <h4 className="font-extrabold text-sm">{cat.category}</h4>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-2">{cat.description}</p>
                                <div className="flex items-start gap-1.5 text-xs text-primary-600 font-semibold">
                                  <Target size={11} className="mt-0.5 flex-shrink-0" />{cat.goal}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}

                      {/* ── TONE TAB ── */}
                      {activeTab === "tone" && record.result?.tone_style && (() => {
                        const ts = editingResultId === record.id && editingResultData ? editingResultData.tone_style : record.result.tone_style;
                        if (!ts) return null;

                        return (
                          editingResultId === record.id && editingResultData ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                  { label: "Tone",  value: ts.tone,  key: "tone"  },
                                  { label: "Style", value: ts.style, key: "style" },
                                  { label: "Voice", value: ts.voice, key: "voice" },
                                ].map(({ label, value, key }) => (
                                  <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                    <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">{label}</div>
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) => {
                                        setEditingResultData({
                                          ...editingResultData,
                                          tone_style: {
                                            ...editingResultData.tone_style,
                                            [key]: e.target.value
                                          }
                                        });
                                      }}
                                      className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-sm font-bold text-primary-600"
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Content Pillars</div>
                                <div className="space-y-2">
                                  {(ts.content_pillars || []).map((pillar, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={pillar}
                                        onChange={(e) => {
                                          const updatedPillars = [...(ts.content_pillars || [])];
                                          updatedPillars[i] = e.target.value;
                                          setEditingResultData({
                                            ...editingResultData,
                                            tone_style: { ...editingResultData.tone_style, content_pillars: updatedPillars }
                                          });
                                        }}
                                        className="flex-1 bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-xs text-primary-600 font-bold"
                                      />
                                      <button
                                        onClick={() => {
                                          const updatedPillars = (ts.content_pillars || []).filter((_, idx) => idx !== i);
                                          setEditingResultData({
                                            ...editingResultData,
                                            tone_style: { ...editingResultData.tone_style, content_pillars: updatedPillars }
                                          });
                                        }}
                                        className="p-1 hover:text-danger transition-colors"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const updatedPillars = [...(ts.content_pillars || []), ""];
                                      setEditingResultData({
                                        ...editingResultData,
                                        tone_style: { ...editingResultData.tone_style, content_pillars: updatedPillars }
                                      });
                                    }}
                                    className="text-[11px] font-bold text-primary-600 hover:underline flex items-center gap-1 mt-1"
                                  >
                                    <Plus size={10} /> Add Pillar
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                  <div className="text-xs font-extrabold text-[#38B2AC] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Check size={12} /> Do's</div>
                                  <div className="space-y-2">
                                    {(ts.dos || []).map((d, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={d}
                                          onChange={(e) => {
                                            const updatedDos = [...(ts.dos || [])];
                                            updatedDos[i] = e.target.value;
                                            setEditingResultData({
                                              ...editingResultData,
                                              tone_style: { ...editingResultData.tone_style, dos: updatedDos }
                                            });
                                          }}
                                          className="flex-1 bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-xs text-slate-500 font-medium"
                                        />
                                        <button
                                          onClick={() => {
                                            const updatedDos = (ts.dos || []).filter((_, idx) => idx !== i);
                                            setEditingResultData({
                                              ...editingResultData,
                                              tone_style: { ...editingResultData.tone_style, dos: updatedDos }
                                            });
                                          }}
                                          className="p-1 hover:text-danger transition-colors"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={() => {
                                        const updatedDos = [...(ts.dos || []), ""];
                                        setEditingResultData({
                                          ...editingResultData,
                                          tone_style: { ...editingResultData.tone_style, dos: updatedDos }
                                        });
                                      }}
                                      className="text-[11px] font-bold text-[#38B2AC] hover:underline flex items-center gap-1 mt-1"
                                    >
                                      <Plus size={10} /> Add Do
                                    </button>
                                  </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                  <div className="text-xs font-extrabold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><AlertTriangle size={12} /> Don'ts</div>
                                  <div className="space-y-2">
                                    {(ts.donts || []).map((d, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={d}
                                          onChange={(e) => {
                                            const updatedDonts = [...(ts.donts || [])];
                                            updatedDonts[i] = e.target.value;
                                            setEditingResultData({
                                              ...editingResultData,
                                              tone_style: { ...editingResultData.tone_style, donts: updatedDonts }
                                            });
                                          }}
                                          className="flex-1 bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-primary-600 py-0.5 text-xs text-slate-500 font-medium"
                                        />
                                        <button
                                          onClick={() => {
                                            const updatedDonts = (ts.donts || []).filter((_, idx) => idx !== i);
                                            setEditingResultData({
                                              ...editingResultData,
                                              tone_style: { ...editingResultData.tone_style, donts: updatedDonts }
                                            });
                                          }}
                                          className="p-1 hover:text-danger transition-colors"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={() => {
                                        const updatedDonts = [...(ts.donts || []), ""];
                                        setEditingResultData({
                                          ...editingResultData,
                                          tone_style: { ...editingResultData.tone_style, donts: updatedDonts }
                                        });
                                      }}
                                      className="text-[11px] font-bold text-red-400 hover:underline flex items-center gap-1 mt-1"
                                    >
                                      <Plus size={10} /> Add Don't
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                  { label: "Tone",  value: ts.tone  },
                                  { label: "Style", value: ts.style },
                                  { label: "Voice", value: ts.voice },
                                ].map(({ label, value }) => (
                                  <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                    <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">{label}</div>
                                    <p className="text-sm font-bold text-primary-600">{value}</p>
                                  </div>
                                ))}
                              </div>
                              {ts.content_pillars?.length > 0 && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                  <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Content Pillars</div>
                                  <div className="flex flex-wrap gap-2">
                                    {ts.content_pillars.map((p, i) => (
                                      <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-xl text-sm font-bold text-primary-600">{p}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                  <div className="text-xs font-extrabold text-[#38B2AC] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Check size={12} /> Do's</div>
                                  <ul className="space-y-2">{ts.dos?.map((d, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-500">
                                      <Check size={13} className="text-[#38B2AC] flex-shrink-0 mt-0.5" />{d}
                                    </li>
                                  ))}</ul>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5">
                                  <div className="text-xs font-extrabold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><AlertTriangle size={12} /> Don'ts</div>
                                  <ul className="space-y-2">{ts.donts?.map((d, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-500">
                                      <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />{d}
                                    </li>
                                  ))}</ul>
                                </div>
                              </div>
                            </div>
                          )
                        );
                      })()}

                      {/* AI Refinement Panel */}
                      {editingResultId !== record.id && (
                        <div className="mt-8 border-t border-[#d0d7e3] pt-6">
                          <div className="bg-white border border-slate-200 shadow-sm rounded-lg rounded-2xl p-5 bg-slate-50">
                            <h4 className="font-extrabold text-sm mb-2 text-primary-600 flex items-center gap-2">
                              <Sparkles size={16} /> Refine Content Ideas with AI
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mb-3">
                              Provide your specific queries, preferences, or requested changes. The AI will intelligently modify and regenerate the ideas and brand style according to your feedback.
                            </p>
                            <div className="flex flex-col gap-3">
                              <textarea
                                value={refinementFeedback}
                                onChange={(e) => setRefinementFeedback(e.target.value)}
                                placeholder="e.g. Focus more on video formats for YouTube, change the tone to bold and authoritative, or add specific promotional caption hooks..."
                                rows={3}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl bg-transparent rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all resize-none"
                                disabled={refining}
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleRefine(record.id)}
                                  disabled={!refinementFeedback.trim() || refining}
                                  className="inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {refining ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin" />
                                      Refining Ideas...
                                    </>
                                  ) : (
                                    <>
                                      <Send size={13} />
                                      Submit Feedback
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
