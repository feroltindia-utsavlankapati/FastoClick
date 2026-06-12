import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Check, X, Loader2 } from "lucide-react";

interface Agent {
    agent_id: string;
    name: string;
    version: string;
    description: string;
    capabilities: string[];
}

export default function AgentListPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [executingId, setExecutingId] = useState<string | null>(null);
    const [executionResult, setExecutionResult] = useState<{output: any, confidence: number} | null>(null);
    const [taskDescriptions, setTaskDescriptions] = useState<Record<string, string>>({});const [taskDescription, setTaskDescription] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAgents = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/auth");
                return;
            }

            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/agent/agents`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok) {
                    setAgents(data);
                } else {
                    console.error("Failed to fetch agents", data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAgents();
    }, [navigate]);

    const handleExecute = async (agentId: string) => {
        const taskDescription = taskDescriptions[agentId] || "";
        if (!taskDescription.trim()) return;
        setExecutingId(agentId);
        setExecutionResult(null);

        const token = localStorage.getItem("token");
        try {
            const activeProjectId = localStorage.getItem("active_project_id");
            const projectQuery = activeProjectId ? `?project_id=${activeProjectId}` : "";
            const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/agent/agents/${agentId}/execute${projectQuery}`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ description: taskDescription })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setExecutionResult(data.data);
            } else {
                alert("Execution failed. Make sure your server and LLM API keys are configured correctly.");
            }
        } catch (err) {
            console.error(err);
            alert("Error executing agent.");
        } finally {
            setExecutingId(null);
            setTaskDescriptions((prev) => ({
                ...prev,
                [agentId]: "",
            }));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative">
                        
            {/* Visual Decoration */}
            <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-slate-50 border border-slate-200 rounded-xl pointer-events-none opacity-20 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full bg-white border border-slate-200 shadow-sm rounded-xl"></div>
            </div>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-10 relative z-10">
                <header className="mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">Agent Registry</h1>
                    <p className="text-slate-500 font-medium">View and execute your available AI marketing agents.</p>
                </header>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {agents.map((agent) => (
                            <div key={agent.agent_id} className="bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow rounded-[32px] p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        {/* Icon Well */}
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 shadow-inner rounded-xl flex items-center justify-center animate-float">
                                            <Bot size={28} className="text-primary-600" />
                                        </div>
                                        <span className="px-4 py-1.5 bg-slate-50 border border-slate-200 shadow-inner rounded-md rounded-full text-xs font-bold text-slate-500">
                                            v{agent.version}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold mb-2">{agent.name}</h3>
                                    <p className="text-sm text-slate-500 font-medium mb-6">{agent.description}</p>
                                    
                                    <div className="mb-6">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-extrabold">Capabilities</div>
                                        <div className="flex flex-wrap gap-2">
                                            {agent.capabilities?.map(cap => (
                                                <span key={cap} className="px-3 py-1.5 bg-slate-50 border border-slate-200 shadow-inner rounded-md text-primary-600 text-xs rounded-xl font-bold">
                                                    {cap.replace(/_/g, " ")}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <input 
                                        type="text" 
                                        placeholder="Task description..."
                                        className="w-full bg-slate-100 border border-slate-200 shadow-inner rounded-xl bg-transparent rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all font-medium"
                                        value={taskDescriptions[agent.agent_id] || ""}
                                            onChange={(e) =>
                                                setTaskDescriptions((prev) => ({
                                                    ...prev,
                                                    [agent.agent_id]: e.target.value,
                                                }))
                                            }
                                        disabled={executingId === agent.agent_id}
                                    />
                                    <button 
                                        onClick={() => handleExecute(agent.agent_id)}
                                        disabled={
                                            executingId === agent.agent_id ||
                                            !(taskDescriptions[agent.agent_id] || "").trim()
                                        }
                                        className="w-full py-3 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {executingId === agent.agent_id ? (
                                            <><Loader2 size={16} className="animate-spin" /> Executing...</>
                                        ) : "Execute Agent"}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {agents.length === 0 && !loading && (
                            <div className="col-span-full text-center p-16 bg-slate-50 border border-slate-200 rounded-xl rounded-[32px]">
                                <p className="text-slate-500 font-bold text-lg">No agents registered.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Result Modal */}
                {executionResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 max-w-2xl w-full relative shadow-2xl">
                            <button 
                                onClick={() => setExecutionResult(null)}
                                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-full font-bold focus:ring-2 focus:ring-primary-500"
                            >
                                <X size={18} className="text-slate-900" />
                            </button>
                            <h2 className="text-2xl font-extrabold mb-8 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                    <Check size={20} className="text-[#38B2AC]" />
                                </span> 
                                Execution Complete
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="text-sm font-bold text-slate-500 mb-3">Confidence Score</div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-4 bg-slate-50 border border-slate-200 rounded-xl rounded-full overflow-hidden p-1">
                                            <div 
                                                className="h-full bg-gradient-to-r from-[#6C63FF] to-[#8B84FF] rounded-full transition-all duration-500"
                                                style={{ width: `${executionResult.confidence * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="font-mono text-primary-600 font-extrabold text-lg">{(executionResult.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-500 mb-3">Agent Output</div>
                                    <div className="bg-slate-100 border border-slate-200 shadow-inner rounded-xl p-5 rounded-2xl text-slate-900 font-mono text-sm max-h-60 overflow-y-auto select-all leading-relaxed whitespace-pre-wrap">
                                        {typeof executionResult.output === "object" 
                                            ? JSON.stringify(executionResult.output, null, 2) 
                                            : executionResult.output}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
