import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
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
    const [taskDescription, setTaskDescription] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAgents = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/auth");
                return;
            }

            try {
                const response = await fetch("http://localhost:8000/agent/agents", {
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
        if (!taskDescription.trim()) return;
        setExecutingId(agentId);
        setExecutionResult(null);

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`http://localhost:8000/agent/agents/${agentId}/execute`, {
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
            setTaskDescription("");
        }
    };

    return (
        <div className="min-h-screen bg-[#E0E5EC] text-[#3D4852] font-sans overflow-hidden flex flex-col relative">
            <NavigationBar />
            
            {/* Visual Decoration */}
            <div className="absolute top-20 left-10 w-96 h-96 rounded-full soft-inset pointer-events-none opacity-20 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full soft-extruded"></div>
            </div>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-10 relative z-10">
                <header className="mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">Agent Registry</h1>
                    <p className="text-[#6B7280] font-medium">View and execute your available AI marketing agents.</p>
                </header>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin h-10 w-10 border-4 border-[#6C63FF] border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {agents.map((agent) => (
                            <div key={agent.agent_id} className="soft-extruded soft-extruded-hover rounded-[32px] p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        {/* Icon Well */}
                                        <div className="w-14 h-14 rounded-2xl soft-inset-deep flex items-center justify-center animate-float">
                                            <Bot size={28} className="text-[#6C63FF]" />
                                        </div>
                                        <span className="px-4 py-1.5 soft-inset-sm rounded-full text-xs font-bold text-[#6B7280]">
                                            v{agent.version}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold mb-2">{agent.name}</h3>
                                    <p className="text-sm text-[#6B7280] font-medium mb-6">{agent.description}</p>
                                    
                                    <div className="mb-6">
                                        <div className="text-xs text-[#6B7280] uppercase tracking-wider mb-3 font-extrabold">Capabilities</div>
                                        <div className="flex flex-wrap gap-2">
                                            {agent.capabilities?.map(cap => (
                                                <span key={cap} className="px-3 py-1.5 soft-inset-sm text-[#6C63FF] text-xs rounded-xl font-bold">
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
                                        className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all font-medium"
                                        value={taskDescription}
                                        onChange={e => setTaskDescription(e.target.value)}
                                        disabled={executingId === agent.agent_id}
                                    />
                                    <button 
                                        onClick={() => handleExecute(agent.agent_id)}
                                        disabled={executingId === agent.agent_id || !taskDescription}
                                        className="w-full py-3 soft-btn-primary rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {executingId === agent.agent_id ? (
                                            <><Loader2 size={16} className="animate-spin" /> Executing...</>
                                        ) : "Execute Agent"}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {agents.length === 0 && !loading && (
                            <div className="col-span-full text-center p-16 soft-inset rounded-[32px]">
                                <p className="text-[#6B7280] font-bold text-lg">No agents registered.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Result Modal */}
                {executionResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                        <div className="soft-extruded rounded-[32px] p-8 max-w-2xl w-full relative shadow-2xl">
                            <button 
                                onClick={() => setExecutionResult(null)}
                                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center soft-btn rounded-full font-bold focus:ring-2 focus:ring-[#6C63FF]"
                            >
                                <X size={18} className="text-[#3D4852]" />
                            </button>
                            <h2 className="text-2xl font-extrabold mb-8 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-2xl soft-inset flex items-center justify-center">
                                    <Check size={20} className="text-[#38B2AC]" />
                                </span> 
                                Execution Complete
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="text-sm font-bold text-[#6B7280] mb-3">Confidence Score</div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-4 soft-inset rounded-full overflow-hidden p-1">
                                            <div 
                                                className="h-full bg-gradient-to-r from-[#6C63FF] to-[#8B84FF] rounded-full transition-all duration-500"
                                                style={{ width: `${executionResult.confidence * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="font-mono text-[#6C63FF] font-extrabold text-lg">{(executionResult.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[#6B7280] mb-3">Agent Output</div>
                                    <div className="soft-inset-deep p-5 rounded-2xl text-[#3D4852] font-mono text-sm max-h-60 overflow-y-auto select-all leading-relaxed whitespace-pre-wrap">
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
