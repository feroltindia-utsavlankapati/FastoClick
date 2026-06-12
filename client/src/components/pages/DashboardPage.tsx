import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Building2 } from "lucide-react";
import Card from "../UI/Card";
import Button from "../UI/Button";

interface DashboardData {
    user: { id: string, username: string, email: string };
    tenant: { id: string, name: string, plan: string, created_at: string };
    stats: { active_campaigns: number, total_leads: number, monthly_spend: number };
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [activeWorkspaceName, setActiveWorkspaceName] = useState<string>("Loading...");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboard = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/auth");
                return;
            }

            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/tenant/dashboard`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                
                const json = await response.json();
                
                if (!response.ok || !json.success) {
                    throw new Error(json.error?.message || "Failed to load dashboard");
                }
                
                setData(json.data);

                // Fetch active project/workspace name
                const activeProjectId = localStorage.getItem("active_project_id");
                if (activeProjectId) {
                    try {
                        const projResponse = await fetch(`${import.meta.env.VITE_BACKEND_API}/tenant/projects/${activeProjectId}`, {
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (projResponse.ok) {
                            const projData = await projResponse.json();
                            setActiveWorkspaceName(projData.name);
                        } else {
                            setActiveWorkspaceName("Unknown Workspace");
                        }
                    } catch (e) {
                        setActiveWorkspaceName("Unknown Workspace");
                    }
                } else {
                    setActiveWorkspaceName("No Workspace Selected");
                }

            } catch (err: any) {
                setError(err.message);
                if (err.message.includes("token")) {
                    localStorage.removeItem("token");
                    navigate("/auth");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/auth");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 p-4">
                <Card className="max-w-md w-full text-center p-8">
                    <h2 className="text-xl font-semibold text-danger mb-2">Error Loading Dashboard</h2>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <Button onClick={handleLogout} variant="primary">
                        Return to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative">
                        
            <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {data?.user.username}</h1>
                        <p className="text-slate-500 mt-1">
                            Active Workspace: <span className="font-semibold text-slate-900">{activeWorkspaceName}</span>
                        </p>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="p-6 border-l-4 border-l-primary-500">
                        <div className="text-slate-500 text-sm font-medium mb-1">Active Campaigns</div>
                        <div className="text-3xl font-bold tracking-tight">{data?.stats.active_campaigns}</div>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-success">
                        <div className="text-slate-500 text-sm font-medium mb-1">Total Leads Generated</div>
                        <div className="text-3xl font-bold tracking-tight">{data?.stats.total_leads}</div>
                    </Card>
                    <Card className="p-6 border-l-4 border-l-slate-900">
                        <div className="text-slate-500 text-sm font-medium mb-1">Monthly Ad Spend</div>
                        <div className="text-3xl font-bold tracking-tight">${data?.stats.monthly_spend.toFixed(2)}</div>
                    </Card>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Details */}
                    <Card>
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <User size={20} className="text-slate-400" />
                            User Details
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <div className="text-sm font-medium text-slate-500 mb-1">Email Address</div>
                                <div className="font-medium">{data?.user.email}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-500 mb-1">User ID</div>
                                <div className="font-mono text-sm text-slate-600 bg-slate-100 p-2 rounded">
                                    {data?.user.id}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Tenant Plan */}
                    <Card className="relative overflow-hidden">
                        <div className="absolute top-6 right-6 opacity-5 select-none pointer-events-none">
                            <Building2 size={120} />
                        </div>
                        
                        <div className="relative z-10">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <Building2 size={20} className="text-slate-400" />
                                Workspace Plan
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="text-sm font-medium text-slate-500 mb-1">Current Tier</div>
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 uppercase tracking-wide">
                                        {data?.tenant.plan}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-500 mb-1">Account Created</div>
                                    <div className="font-medium text-slate-900">
                                        {new Date(data?.tenant.created_at || "").toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
