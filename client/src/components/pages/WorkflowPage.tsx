import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import {
  Search, Bot, Zap, Radio, Check, Loader2,
  Clock, AlertCircle, ListChecks, ArrowRight,
  Target, LayoutList, Radio as RadioIcon
} from "lucide-react";

type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | null;

interface JobResult {
  plan?: {
    company_name?: string;
    industry?: string;
    strategy?: {
      business_goal?: string;
      marketing_goal?: string;
      core_strategy?: string[];
    };
    campaign_plans?: {
      phases?: { phase: string; duration: string; tasks: string[] }[];
      channels?: { channel: string; objective: string; kpi: string }[];
    };
  };
}

interface Job {
  workflow_id: string;
  workflow_name: string;
  status: JobStatus;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  result?: any;
}

const STATUS_CONFIG = {
  QUEUED:    { label: "Queued",    color: "text-slate-400",  bg: "",                        icon: Clock },
  RUNNING:   { label: "Running",   color: "text-primary-600",  bg: "bg-primary-600/5",          icon: Loader2 },
  COMPLETED: { label: "Completed", color: "text-[#38B2AC]",  bg: "bg-[#38B2AC]/5",          icon: Check },
  FAILED:    { label: "Failed",    color: "text-danger",    bg: "bg-red-50",               icon: AlertCircle },
};

const STEPS = ["QUEUED", "RUNNING", "COMPLETED"] as const;

export default function WorkflowPage() {
  const navigate = useNavigate();
  const [executing, setExecuting]   = useState(false);
  const [job, setJob]               = useState<Job | null>(null);
  const [planResult, setPlanResult] = useState<JobResult | null>(null);
  const [pollError, setPollError]   = useState<string | null>(null);

  const token = localStorage.getItem("token");

  // ── Start workflow ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!token) { navigate("/auth"); return; }
    setExecuting(true);
    setJob(null);
    setPlanResult(null);
    setPollError(null);

    try {
      const res  = await fetch("http://localhost:8000/workflow/start", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_name: "SEOAuditWorkflow",
          params: { description: "Run SEO Audit and Marketing Strategy" }
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setJob({
          workflow_id:   data.workflow_id,
          workflow_name: "SEOAuditWorkflow",
          status:        "QUEUED",
          started_at:    new Date().toISOString(),
          finished_at:   null,
          error:         null,
        });
        pollStatus(data.workflow_id, 0);
      } else {
        setPollError(`Failed to start: ${data.detail || "Unknown error"}`);
        setExecuting(false);
      }
    } catch (err) {
      setPollError("Cannot reach the Workflow Engine. Is the server running?");
      setExecuting(false);
    }
  };

  // ── Poll status ─────────────────────────────────────────────────────────────
  const pollStatus = async (id: string, attempt: number) => {
    if (!token) return;

    // Max 180 polls (~7.5 min with 2.5s interval)
    if (attempt > 180) {
      setPollError("Workflow timed out waiting for result.");
      setExecuting(false);
      return;
    }

    try {
      const res  = await fetch(`http://localhost:8000/workflow/status/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.status === 404) {
        setPollError("Workflow not found — the server may have restarted. Please run again.");
        setJob(prev => prev ? { ...prev, status: "FAILED" } : null);
        setExecuting(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setPollError(data.detail || "Status check failed.");
        setExecuting(false);
        return;
      }

      setJob(prev => prev ? {
        ...prev,
        status:      data.status,
        finished_at: data.finished_at,
        error:       data.error,
        result:      data.result,
      } : null);

      if (data.status === "COMPLETED") {
        setExecuting(false);
        // Extract plan from the agent result
        const agentOutput = data.result?.data?.plan;
        if (agentOutput) setPlanResult({ plan: agentOutput });
      } else if (data.status === "FAILED") {
        setExecuting(false);
      } else {
        // Still QUEUED or RUNNING — keep polling
        setTimeout(() => pollStatus(id, attempt + 1), 2500);
      }
    } catch (err) {
      // Network error — retry a few times before giving up
      if (attempt < 5) {
        setTimeout(() => pollStatus(id, attempt + 1), 3000);
      } else {
        setPollError("Lost connection to server.");
        setExecuting(false);
      }
    }
  };

  const statusCfg = job?.status ? STATUS_CONFIG[job.status] : null;
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-hidden">
      <NavigationBar />

      {/* Decoration */}
      <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-slate-50 border border-slate-200 rounded-xl pointer-events-none opacity-20">
        <div className="w-64 h-64 rounded-full bg-white border border-slate-200 shadow-sm rounded-xl m-16" />
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-10 relative z-10">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Workflow Library</h1>
          <p className="text-slate-500 font-medium">Trigger multi-agent workflows and monitor live execution.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">

          {/* ── LEFT: Workflow card ──────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 shadow-inner rounded-xl flex items-center justify-center animate-float">
                  <Search size={28} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">SEO Audit & Action Plan</h2>
                  <p className="text-primary-600 text-sm font-extrabold">On-Demand</p>
                </div>
              </div>

              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                Runs technical SEO analysis and automatically generates a full marketing strategy plan.
                Results are saved to your Plans library.
              </p>

              {/* Agents */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 rounded-2xl mb-5">
                <div className="text-xs text-slate-500 mb-3 uppercase font-extrabold tracking-wider">Agents</div>
                <div className="flex flex-wrap gap-3">
                  {["Strategy Planner", "SEO Specialist"].map(a => (
                    <span key={a} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg rounded-xl text-xs font-bold">
                      <Bot size={14} className="text-primary-600" />{a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 rounded-2xl">
                <div className="text-xs text-slate-500 mb-3 uppercase font-extrabold tracking-wider">Workflow Steps</div>
                <ol className="space-y-2">
                  {[
                    "Fetch company context from DB",
                    "Generate core strategy via AI",
                    "Plan execution phases & channels",
                    "Save plan to Strategy Library"
                  ].map((s, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-500">
                      <span className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-200 shadow-inner rounded-md flex items-center justify-center text-primary-600 text-xs font-extrabold flex-shrink-0">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={executing}
              className="mt-8 w-full py-4 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {executing
                ? <><Loader2 size={20} className="animate-spin" /> Running…</>
                : <><span>▶ Run SEO Audit</span><ArrowRight size={18} /></>
              }
            </button>
          </div>

          {/* ── RIGHT: Live Monitor ─────────────────────────────────────── */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8">
              <h2 className="text-2xl font-bold mb-7 flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                  <Zap size={20} className="text-primary-600" />
                </span>
                Live Monitor
              </h2>

              {/* Poll error banner */}
              {pollError && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-4 mb-5 flex items-start gap-3 text-sm font-medium text-danger">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {pollError}
                </div>
              )}

              {job ? (
                <div className="space-y-5">
                  {/* Status */}
                  <div className={`bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5 ${statusCfg?.bg ?? ""}`}>
                    <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Status</div>
                    <div className={`flex items-center gap-3 font-extrabold text-xl ${statusCfg?.color}`}>
                      {statusCfg && (
                        <statusCfg.icon
                          size={22}
                          className={job.status === "RUNNING" ? "animate-spin" : ""}
                        />
                      )}
                      {statusCfg?.label ?? job.status}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2 px-1">
                    {STEPS.map((s, i) => {
                      const curIdx = STEPS.indexOf((job.status as typeof STEPS[number]) ?? "QUEUED");
                      const done   = i < curIdx || job.status === "COMPLETED";
                      const active = i === curIdx;
                      return (
                        <div key={s} className="flex items-center gap-2 flex-1">
                          <div className={`flex-1 h-1.5 rounded-full transition-all duration-700 ${
                            done ? "bg-primary-600" : active ? "bg-primary-600/35" : "bg-[#C8CEDA]"
                          }`} />
                          {i < STEPS.length - 1 && (
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-700 ${
                              done || active ? "bg-primary-600" : "bg-[#C8CEDA]"
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Meta */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5 space-y-3">
                    <div>
                      <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Workflow ID</div>
                      <div className="font-mono text-xs text-slate-400 break-all">{job.workflow_id}</div>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Started</div>
                        <div className="text-sm font-medium">{fmt(job.started_at)}</div>
                      </div>
                      {job.finished_at && (
                        <div>
                          <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1">Finished</div>
                          <div className="text-sm font-medium">{fmt(job.finished_at)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error detail */}
                  {job.error && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-4 text-sm text-danger font-medium flex items-start gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      {job.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-slate-200 rounded-xl rounded-2xl min-h-[180px]">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 shadow-inner rounded-xl flex items-center justify-center mb-4 animate-float">
                    <Radio size={28} className="text-slate-500" />
                  </div>
                  <p className="text-slate-500 font-bold">Trigger a workflow to see live status here.</p>
                  <p className="text-slate-400 text-sm mt-1 font-medium">No Temporal required.</p>
                </div>
              )}
            </div>

            {/* ── Inline Plan Result ──────────────────────────────────── */}
            {planResult?.plan && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                    <Check size={20} className="text-[#38B2AC]" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-lg">Plan Generated</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {planResult.plan.company_name} · {planResult.plan.industry}
                    </p>
                  </div>
                </div>

                {/* Strategy goals */}
                {planResult.plan.strategy && (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-4">
                      <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Business Goal</div>
                      <p className="text-sm font-medium leading-relaxed">{planResult.plan.strategy.business_goal || "—"}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-4">
                      <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Marketing Goal</div>
                      <p className="text-sm font-medium leading-relaxed">{planResult.plan.strategy.marketing_goal || "—"}</p>
                    </div>
                    {(planResult.plan.strategy.core_strategy ?? []).length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-4">
                        <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Core Strategy</div>
                        <ul className="space-y-2">
                          {planResult.plan.strategy.core_strategy!.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-500">
                              <span className="w-5 h-5 rounded-md bg-slate-50 border border-slate-200 shadow-inner rounded-md flex items-center justify-center text-primary-600 text-xs font-extrabold flex-shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Phases summary */}
                {(planResult.plan.campaign_plans?.phases ?? []).length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-4">
                    <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <LayoutList size={13} /> Execution Phases
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {planResult.plan.campaign_plans!.phases!.map((ph, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-xl p-3">
                          <p className="text-xs font-extrabold text-primary-600 mb-0.5">{ph.duration}</p>
                          <p className="text-xs font-medium text-slate-500 truncate">{ph.phase}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Channels summary */}
                {(planResult.plan.campaign_plans?.channels ?? []).length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-4">
                    <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Target size={13} /> Marketing Channels
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {planResult.plan.campaign_plans!.channels!.map((ch, i) => (
                        <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-xl text-xs font-bold text-primary-600">
                          {ch.channel}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigate to plans */}
                <button
                  onClick={() => navigate("/plans")}
                  className="w-full py-3 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <ListChecks size={16} /> View Full Plan in Plans Library
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
