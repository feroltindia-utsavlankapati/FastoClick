import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import {
  FileText, Trash2, ChevronDown, ChevronUp,
  Building2, Target, LayoutList, Radio, Calendar,
  Loader2, AlertTriangle, Sparkles, Send, Edit2, Plus, Check
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Phase {
  phase: string;
  duration: string;
  tasks: string[];
}

interface Channel {
  channel: string;
  objective: string;
  kpi: string;
}

interface ExecutionItem {
  week: string;
  activity: string;
  owner: string;
  status: string;
}

interface Plan {
  id: string;
  company_name: string;
  industry: string;
  user_prompt: string;
  created_at: string;
  plan: {
    strategy: {
      business_goal: string;
      marketing_goal: string;
      core_strategy: string[];
    };
    campaign_plans: {
      phases: Phase[];
      channels: Channel[];
      execution_plan: ExecutionItem[];
    };
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"strategy" | "phases" | "channels" | "timeline">("strategy");
  const [refinementFeedback, setRefinementFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  
  // Editing State
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanData, setEditingPlanData] = useState<Plan['plan'] | null>(null);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const startEditing = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setEditingPlanData(JSON.parse(JSON.stringify(plan.plan)));
  };

  const handleSave = async (planId: string) => {
    if (!token || !editingPlanData) return;
    setSaving(true);
    try {
      const res = await fetch(
        `http://localhost:8000/agent/plans/${planId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: editingPlanData }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setPlans(prev => prev.map(p => p.id === planId ? data.data : p));
        setEditingPlanId(null);
        setEditingPlanData(null);
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

  const handleRefine = async (planId: string) => {
    if (!token || !refinementFeedback.trim()) return;
    setRefining(true);
    try {
      const res = await fetch(
        `http://localhost:8000/agent/plans/${planId}/refine`,
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
        setPlans(prev => prev.map(p => p.id === planId ? data.data : p));
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

  const fetchPlans = async () => {
    if (!token) { navigate("/auth"); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/agent/plans`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok && data.success) setPlans(data.data);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleDelete = async (planId: string) => {
    if (!token) return;
    setDeletingId(planId);
    try {
      const res = await fetch(
        `http://localhost:8000/agent/plans/${planId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.id !== planId));
        if (expandedId === planId) setExpandedId(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    setActiveTab("strategy");
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch { return iso; }
  };

  const TABS = [
    { key: "strategy" as const,  label: "Strategy",  icon: Target },
    { key: "phases"   as const,  label: "Phases",    icon: LayoutList },
    { key: "channels" as const,  label: "Channels",  icon: Radio },
    { key: "timeline" as const,  label: "Timeline",  icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-[#E0E5EC] text-[#3D4852] font-sans flex flex-col">
      <NavigationBar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl soft-inset flex items-center justify-center">
              <FileText size={24} className="text-[#6C63FF]" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight leading-tight">Strategy Plans</h1>
              <p className="text-[#6B7280] font-medium text-sm mt-0.5">
                All generated marketing plans — view details or permanently delete.
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 size={36} className="animate-spin text-[#6C63FF]" />
          </div>
        ) : plans.length === 0 ? (
          <div className="soft-inset rounded-[32px] p-16 text-center">
            <FileText size={48} className="mx-auto text-[#A0AEC0] mb-4" />
            <p className="text-[#6B7280] font-bold text-lg">No strategy plans yet.</p>
            <p className="text-[#A0AEC0] text-sm mt-1">Run a strategy agent to generate and save your first plan.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {plans.map((plan) => {
              const isExpanded = expandedId === plan.id;
              const isConfirming = confirmDeleteId === plan.id;
              const isDeleting  = deletingId === plan.id;

              return (
                <div
                  key={plan.id}
                  className="soft-extruded rounded-[28px] overflow-hidden transition-all duration-300"
                >
                  {/* ── Row Header ── */}
                  <div className="flex items-center gap-4 px-6 py-5">
                    {/* Company icon */}
                    <div className="w-12 h-12 rounded-xl soft-inset flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-[#6C63FF]" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-extrabold text-lg leading-tight">
                          {plan.company_name || "Unknown Company"}
                        </h3>
                        <span className="px-3 py-1 soft-inset-sm rounded-full text-xs font-bold text-[#6C63FF]">
                          {plan.industry || "General"}
                        </span>
                      </div>
                      <p className="text-[#6B7280] text-sm mt-0.5 truncate font-medium">
                        "{plan.user_prompt || "No prompt"}"
                      </p>
                    </div>

                    {/* Meta badges */}
                    <div className="hidden md:flex items-center gap-3 flex-shrink-0 text-xs font-bold text-[#6B7280]">
                      <span className="px-3 py-1.5 soft-inset-sm rounded-full">
                        {plan.plan?.campaign_plans?.phases?.length ?? 0} phases
                      </span>
                      <span className="px-3 py-1.5 soft-inset-sm rounded-full">
                        {plan.plan?.campaign_plans?.channels?.length ?? 0} channels
                      </span>
                      <span className="px-3 py-1.5 soft-inset-sm rounded-full text-[#A0AEC0]">
                        {fmt(plan.created_at)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#E53E3E] font-bold flex items-center gap-1">
                            <AlertTriangle size={12} /> Delete permanently?
                          </span>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : null}
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 soft-btn rounded-xl text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(plan.id)}
                          className="w-9 h-9 flex items-center justify-center soft-btn rounded-xl text-[#E53E3E] hover:bg-red-50 transition-all"
                          title="Delete plan"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpand(plan.id)}
                        className="w-9 h-9 flex items-center justify-center soft-btn rounded-xl transition-all"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded
                          ? <ChevronUp size={16} className="text-[#6C63FF]" />
                          : <ChevronDown size={16} />
                        }
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded Detail Panel ── */}
                  {isExpanded && (
                    <div className="border-t border-[#d0d7e3] px-6 pb-6 pt-5">
                      {/* Tab Bar and Edit Button */}
                      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <div className="flex gap-2 flex-wrap">
                          {TABS.map(({ key, label, icon: Icon }) => (
                            <button
                              key={key}
                              onClick={() => setActiveTab(key)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === key
                                  ? "soft-btn-primary"
                                  : "soft-btn"
                              }`}
                            >
                              <Icon size={14} />
                              {label}
                            </button>
                          ))}
                        </div>

                        <div>
                          {editingPlanId === plan.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSave(plan.id)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                Save Changes
                              </button>
                              <button
                                onClick={() => { setEditingPlanId(null); setEditingPlanData(null); }}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 soft-btn text-gray-500 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(plan)}
                              className="flex items-center gap-1.5 px-4 py-2 soft-btn text-[#6C63FF] rounded-xl text-xs font-bold transition-all"
                            >
                              <Edit2 size={13} />
                              Edit Plan
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ── Strategy Tab ── */}
                      {activeTab === "strategy" && (
                        editingPlanId === plan.id && editingPlanData ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="soft-inset rounded-2xl p-5">
                                <div className="text-xs font-extrabold text-[#6B7280] uppercase tracking-wider mb-2">Business Goal</div>
                                <textarea
                                  value={editingPlanData.strategy?.business_goal || ""}
                                  onChange={(e) => setEditingPlanData({
                                    ...editingPlanData,
                                    strategy: {
                                      ...editingPlanData.strategy,
                                      business_goal: e.target.value
                                    }
                                  })}
                                  className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-1 text-sm font-medium leading-relaxed resize-none"
                                  rows={2}
                                />
                              </div>
                              <div className="soft-inset rounded-2xl p-5">
                                <div className="text-xs font-extrabold text-[#6B7280] uppercase tracking-wider mb-2">Marketing Goal</div>
                                <textarea
                                  value={editingPlanData.strategy?.marketing_goal || ""}
                                  onChange={(e) => setEditingPlanData({
                                    ...editingPlanData,
                                    strategy: {
                                      ...editingPlanData.strategy,
                                      marketing_goal: e.target.value
                                    }
                                  })}
                                  className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-1 text-sm font-medium leading-relaxed resize-none"
                                  rows={2}
                                />
                              </div>
                            </div>
                            <div className="soft-inset rounded-2xl p-5">
                              <div className="text-xs font-extrabold text-[#6B7280] uppercase tracking-wider mb-3">Core Strategy</div>
                              <div className="space-y-3">
                                {(editingPlanData.strategy?.core_strategy || []).map((item, i) => (
                                  <div key={i} className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg soft-inset-sm flex items-center justify-center text-[#6C63FF] text-xs font-extrabold flex-shrink-0">
                                      {i + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={item}
                                      onChange={(e) => {
                                        const updated = [...(editingPlanData.strategy?.core_strategy || [])];
                                        updated[i] = e.target.value;
                                        setEditingPlanData({
                                          ...editingPlanData,
                                          strategy: {
                                            ...editingPlanData.strategy,
                                            core_strategy: updated
                                          }
                                        });
                                      }}
                                      className="flex-1 bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-sm font-medium"
                                    />
                                    <button
                                      onClick={() => {
                                        const updated = (editingPlanData.strategy?.core_strategy || []).filter((_, idx) => idx !== i);
                                        setEditingPlanData({
                                          ...editingPlanData,
                                          strategy: {
                                            ...editingPlanData.strategy,
                                            core_strategy: updated
                                          }
                                        });
                                      }}
                                      className="p-1 hover:text-[#E53E3E] transition-colors"
                                      title="Delete strategy"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => {
                                    const updated = [...(editingPlanData.strategy?.core_strategy || []), ""];
                                    setEditingPlanData({
                                      ...editingPlanData,
                                      strategy: {
                                        ...editingPlanData.strategy,
                                        core_strategy: updated
                                      }
                                    });
                                  }}
                                  className="mt-2 text-xs font-bold text-[#6C63FF] hover:underline flex items-center gap-1"
                                >
                                  <Plus size={12} /> Add Strategy
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="soft-inset rounded-2xl p-5">
                                <div className="text-xs font-extrabold text-[#6B7280] uppercase tracking-wider mb-2">Business Goal</div>
                                <p className="text-sm font-medium leading-relaxed">
                                  {plan.plan?.strategy?.business_goal || "—"}
                                </p>
                              </div>
                              <div className="soft-inset rounded-2xl p-5">
                                <div className="text-xs font-extrabold text-[#6B7280] uppercase tracking-wider mb-2">Marketing Goal</div>
                                <p className="text-sm font-medium leading-relaxed">
                                  {plan.plan?.strategy?.marketing_goal || "—"}
                                </p>
                              </div>
                            </div>
                            <div className="soft-inset rounded-2xl p-5">
                              <div className="text-xs font-extrabold text-[#6B7280] uppercase tracking-wider mb-3">Core Strategy</div>
                              <ul className="space-y-2">
                                {(plan.plan?.strategy?.core_strategy || []).map((item, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm font-medium">
                                    <span className="w-6 h-6 rounded-lg soft-inset-sm flex items-center justify-center text-[#6C63FF] text-xs font-extrabold flex-shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )
                      )}

                      {/* ── Phases Tab ── */}
                      {activeTab === "phases" && (
                        editingPlanId === plan.id && editingPlanData ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left">
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Phase</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-36">Duration</th>
                                  <th className="pb-3 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Tasks</th>
                                  <th className="pb-3 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-16 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#d0d7e3]">
                                {(editingPlanData.campaign_plans?.phases || []).map((phase, i) => (
                                  <tr key={i} className="align-top">
                                    <td className="py-3 pr-4">
                                      <input
                                        type="text"
                                        value={phase.phase}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.phases || [])];
                                          updated[i] = { ...phase, phase: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              phases: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 font-bold"
                                      />
                                    </td>
                                    <td className="py-3 pr-4">
                                      <input
                                        type="text"
                                        value={phase.duration}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.phases || [])];
                                          updated[i] = { ...phase, duration: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              phases: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-xs text-[#6C63FF] font-bold"
                                      />
                                    </td>
                                    <td className="py-3">
                                      <div className="space-y-2">
                                        {phase.tasks.map((task, j) => (
                                          <div key={j} className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] flex-shrink-0" />
                                            <input
                                              type="text"
                                              value={task}
                                              onChange={(e) => {
                                                const updatedPhases = [...(editingPlanData.campaign_plans?.phases || [])];
                                                const updatedTasks = [...phase.tasks];
                                                updatedTasks[j] = e.target.value;
                                                updatedPhases[i] = { ...phase, tasks: updatedTasks };
                                                setEditingPlanData({
                                                  ...editingPlanData,
                                                  campaign_plans: {
                                                    ...editingPlanData.campaign_plans,
                                                    phases: updatedPhases
                                                  }
                                                });
                                              }}
                                              className="flex-1 bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-xs text-[#6B7280] font-medium"
                                            />
                                            <button
                                              onClick={() => {
                                                const updatedPhases = [...(editingPlanData.campaign_plans?.phases || [])];
                                                const updatedTasks = phase.tasks.filter((_, idx) => idx !== j);
                                                updatedPhases[i] = { ...phase, tasks: updatedTasks };
                                                setEditingPlanData({
                                                  ...editingPlanData,
                                                  campaign_plans: {
                                                    ...editingPlanData.campaign_plans,
                                                    phases: updatedPhases
                                                  }
                                                });
                                              }}
                                              className="p-0.5 hover:text-[#E53E3E] transition-colors"
                                              title="Delete task"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => {
                                            const updatedPhases = [...(editingPlanData.campaign_plans?.phases || [])];
                                            const updatedTasks = [...phase.tasks, ""];
                                            updatedPhases[i] = { ...phase, tasks: updatedTasks };
                                            setEditingPlanData({
                                              ...editingPlanData,
                                              campaign_plans: {
                                                ...editingPlanData.campaign_plans,
                                                phases: updatedPhases
                                              }
                                            });
                                          }}
                                          className="text-[11px] font-bold text-[#6C63FF] hover:underline flex items-center gap-1 mt-1"
                                        >
                                          <Plus size={10} /> Add Task
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-3 text-center">
                                      <button
                                        onClick={() => {
                                          const updated = (editingPlanData.campaign_plans?.phases || []).filter((_, idx) => idx !== i);
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              phases: updated
                                            }
                                          });
                                        }}
                                        className="p-1 hover:text-[#E53E3E] transition-colors"
                                        title="Delete phase"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button
                              onClick={() => {
                                const updated = [
                                  ...(editingPlanData.campaign_plans?.phases || []),
                                  { phase: "New Phase", duration: "1 Week", tasks: [] }
                                ];
                                setEditingPlanData({
                                  ...editingPlanData,
                                  campaign_plans: {
                                    ...editingPlanData.campaign_plans,
                                    phases: updated
                                  }
                                });
                              }}
                              className="mt-3 text-xs font-bold text-[#6C63FF] hover:underline flex items-center gap-1"
                            >
                              <Plus size={12} /> Add Phase
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left">
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Phase</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-28">Duration</th>
                                  <th className="pb-3 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Tasks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#d0d7e3]">
                                {(plan.plan?.campaign_plans?.phases || []).map((phase, i) => (
                                  <tr key={i} className="align-top">
                                    <td className="py-3 pr-4 font-bold">{phase.phase}</td>
                                    <td className="py-3 pr-4">
                                      <span className="px-2 py-1 soft-inset-sm rounded-lg text-[#6C63FF] font-bold text-xs whitespace-nowrap">
                                        {phase.duration}
                                      </span>
                                    </td>
                                    <td className="py-3">
                                      <ul className="space-y-1">
                                        {phase.tasks.map((t, j) => (
                                          <li key={j} className="flex items-start gap-2 text-[#6B7280]">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#6C63FF] flex-shrink-0" />
                                            {t}
                                          </li>
                                        ))}
                                      </ul>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}

                      {/* ── Channels Tab ── */}
                      {activeTab === "channels" && (
                        editingPlanId === plan.id && editingPlanData ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left">
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-40">Channel</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Objective</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">KPI</th>
                                  <th className="pb-3 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-16 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#d0d7e3]">
                                {(editingPlanData.campaign_plans?.channels || []).map((ch, i) => (
                                  <tr key={i} className="align-top">
                                    <td className="py-3 pr-4">
                                      <input
                                        type="text"
                                        value={ch.channel}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.channels || [])];
                                          updated[i] = { ...ch, channel: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              channels: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-xs text-[#6C63FF] font-bold"
                                      />
                                    </td>
                                    <td className="py-3 pr-4">
                                      <input
                                        type="text"
                                        value={ch.objective}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.channels || [])];
                                          updated[i] = { ...ch, objective: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              channels: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-xs text-[#6B7280] font-medium"
                                      />
                                    </td>
                                    <td className="py-3 pr-4">
                                      <input
                                        type="text"
                                        value={ch.kpi}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.channels || [])];
                                          updated[i] = { ...ch, kpi: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              channels: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-xs text-[#38B2AC] font-semibold"
                                      />
                                    </td>
                                    <td className="py-3 text-center">
                                      <button
                                        onClick={() => {
                                          const updated = (editingPlanData.campaign_plans?.channels || []).filter((_, idx) => idx !== i);
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              channels: updated
                                            }
                                          });
                                        }}
                                        className="p-1 hover:text-[#E53E3E] transition-colors"
                                        title="Delete channel"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button
                              onClick={() => {
                                const updated = [
                                  ...(editingPlanData.campaign_plans?.channels || []),
                                  { channel: "New Channel", objective: "", kpi: "" }
                                ];
                                setEditingPlanData({
                                  ...editingPlanData,
                                  campaign_plans: {
                                    ...editingPlanData.campaign_plans,
                                    channels: updated
                                  }
                                });
                              }}
                              className="mt-3 text-xs font-bold text-[#6C63FF] hover:underline flex items-center gap-1"
                            >
                              <Plus size={12} /> Add Channel
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left">
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Channel</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Objective</th>
                                  <th className="pb-3 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">KPI</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#d0d7e3]">
                                {(plan.plan?.campaign_plans?.channels || []).map((ch, i) => (
                                  <tr key={i} className="align-top">
                                    <td className="py-3 pr-4">
                                      <span className="font-bold px-2 py-1 soft-inset-sm rounded-lg text-[#6C63FF] text-xs whitespace-nowrap">
                                        {ch.channel}
                                      </span>
                                    </td>
                                    <td className="py-3 pr-4 text-[#6B7280] font-medium">{ch.objective}</td>
                                    <td className="py-3 font-medium text-[#38B2AC]">{ch.kpi}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}

                      {/* ── Timeline Tab ── */}
                      {activeTab === "timeline" && (
                        editingPlanId === plan.id && editingPlanData ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left">
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-24">Week</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Activity</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Owner</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-32">Status</th>
                                  <th className="pb-3 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-16 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#d0d7e3]">
                                {(editingPlanData.campaign_plans?.execution_plan || []).map((item, i) => (
                                  <tr key={i} className="align-top">
                                    <td className="py-3 pr-4">
                                      <input
                                        type="text"
                                        value={item.week}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.execution_plan || [])];
                                          updated[i] = { ...item, week: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              execution_plan: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-xs text-[#6C63FF] font-bold"
                                      />
                                    </td>
                                    <td className="py-3 pr-4">
                                      <input
                                        type="text"
                                        value={item.activity}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.execution_plan || [])];
                                          updated[i] = { ...item, activity: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              execution_plan: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-xs text-[#3D4852] font-medium"
                                      />
                                    </td>
                                    <td className="py-3 pr-4">
                                      <input
                                        type="text"
                                        value={item.owner}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.execution_plan || [])];
                                          updated[i] = { ...item, owner: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              execution_plan: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-transparent focus:outline-none border-b border-[#c0c7d3] focus:border-[#6C63FF] py-0.5 text-xs text-[#6B7280] font-medium"
                                      />
                                    </td>
                                    <td className="py-3 pr-4">
                                      <select
                                        value={item.status}
                                        onChange={(e) => {
                                          const updated = [...(editingPlanData.campaign_plans?.execution_plan || [])];
                                          updated[i] = { ...item, status: e.target.value };
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              execution_plan: updated
                                            }
                                          });
                                        }}
                                        className="w-full bg-[#E0E5EC] soft-inset-sm rounded-lg px-2 py-1 text-xs font-bold text-[#6B7280] focus:outline-none"
                                      >
                                        <option value="Pending">Pending</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                      </select>
                                    </td>
                                    <td className="py-3 text-center">
                                      <button
                                        onClick={() => {
                                          const updated = (editingPlanData.campaign_plans?.execution_plan || []).filter((_, idx) => idx !== i);
                                          setEditingPlanData({
                                            ...editingPlanData,
                                            campaign_plans: {
                                              ...editingPlanData.campaign_plans,
                                              execution_plan: updated
                                            }
                                          });
                                        }}
                                        className="p-1 hover:text-[#E53E3E] transition-colors"
                                        title="Delete timeline item"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button
                              onClick={() => {
                                const updated = [
                                  ...(editingPlanData.campaign_plans?.execution_plan || []),
                                  { week: "Week 1", activity: "", owner: "Team", status: "Pending" }
                                ];
                                setEditingPlanData({
                                  ...editingPlanData,
                                  campaign_plans: {
                                    ...editingPlanData.campaign_plans,
                                    execution_plan: updated
                                  }
                                });
                              }}
                              className="mt-3 text-xs font-bold text-[#6C63FF] hover:underline flex items-center gap-1"
                            >
                              <Plus size={12} /> Add Timeline Item
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left">
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider w-20">Week</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Activity</th>
                                  <th className="pb-3 pr-4 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Owner</th>
                                  <th className="pb-3 text-xs font-extrabold text-[#6B7280] uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#d0d7e3]">
                                {(plan.plan?.campaign_plans?.execution_plan || []).map((item, i) => (
                                  <tr key={i} className="align-top">
                                    <td className="py-3 pr-4">
                                      <span className="font-extrabold text-[#6C63FF]">{item.week}</span>
                                    </td>
                                    <td className="py-3 pr-4 font-medium text-[#3D4852]">{item.activity}</td>
                                    <td className="py-3 pr-4 text-[#6B7280] font-medium">{item.owner}</td>
                                    <td className="py-3">
                                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                        item.status === "Done"
                                          ? "bg-green-100 text-green-700"
                                          : "soft-inset-sm text-[#6B7280]"
                                      }`}>
                                        {item.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}

                      {/* AI Refinement Panel (Only show when not manually editing content) */}
                      {editingPlanId !== plan.id && (
                        <div className="mt-8 border-t border-[#d0d7e3] pt-6">
                          <div className="soft-extruded-sm rounded-2xl p-5 bg-[#E0E5EC]">
                            <h4 className="font-extrabold text-sm mb-2 text-[#6C63FF] flex items-center gap-2">
                              <Sparkles size={16} /> Refine Strategy Plan with AI
                            </h4>
                            <p className="text-xs text-[#6B7280] font-medium mb-3">
                              Provide your specific queries, preferences, or requested changes. The AI will intelligently modify and regenerate the plan according to your feedback.
                            </p>
                            <div className="flex flex-col gap-3">
                              <textarea
                                value={refinementFeedback}
                                onChange={(e) => setRefinementFeedback(e.target.value)}
                                placeholder="e.g. Focus more on digital marketing channels rather than physical events, or make the duration of Phase 1 to be 3 weeks..."
                                rows={3}
                                className="w-full soft-inset bg-transparent rounded-xl p-3 text-xs font-medium text-[#3D4852] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all resize-none"
                                disabled={refining}
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleRefine(plan.id)}
                                  disabled={!refinementFeedback.trim() || refining}
                                  className="soft-btn-primary rounded-xl px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {refining ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin" />
                                      Refining Plan...
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
