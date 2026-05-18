import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import { User, Building2 } from "lucide-react";

interface DashboardData {
    user: { id: string, username: string, email: string };
    tenant: { id: string, name: string, plan: string, created_at: string };
    stats: { active_campaigns: number, total_leads: number, monthly_spend: number };
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
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
                const response = await fetch("http://localhost:8000/tenant/dashboard", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                
                const json = await response.json();
                
                if (!response.ok || !json.success) {
                    throw new Error(json.error?.message || "Failed to load dashboard");
                }
                
                setData(json.data);
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
            <div className="min-h-screen bg-[#E0E5EC] flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-[#6C63FF] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#E0E5EC] flex flex-col items-center justify-center text-[#3D4852] p-4">
                <div className="soft-extruded p-8 rounded-[32px] max-w-md text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-2">Error Loading Dashboard</h2>
                    <p className="text-[#6B7280] mb-6">{error}</p>
                    <button 
                        onClick={handleLogout} 
                        className="px-6 py-3 soft-btn rounded-2xl font-bold focus:ring-2 focus:ring-[#6C63FF]"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#E0E5EC] text-[#3D4852] font-sans overflow-hidden flex flex-col relative">
            <NavigationBar />
            
            {/* Concentric Circle Visual Decorations */}
            <div className="absolute top-10 right-10 w-96 h-96 rounded-full soft-inset pointer-events-none opacity-20 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full soft-extruded flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full soft-inset"></div>
                </div>
            </div>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-10 relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Welcome back, {data?.user.username}</h1>
                        <p className="text-[#6B7280] mt-1 font-medium">
                            Managing workspace: <span className="text-[#6C63FF] font-bold">{data?.tenant.name}</span>
                        </p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="px-6 py-3 soft-btn rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
                    >
                        Sign Out
                    </button>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="soft-extruded soft-extruded-hover rounded-[32px] p-8">
                        <div className="text-[#6B7280] text-sm font-bold mb-3 uppercase tracking-wider">Active Campaigns</div>
                        <div className="text-5xl font-extrabold text-[#6C63FF] tracking-tight">{data?.stats.active_campaigns}</div>
                    </div>
                    <div className="soft-extruded soft-extruded-hover rounded-[32px] p-8">
                        <div className="text-[#6B7280] text-sm font-bold mb-3 uppercase tracking-wider">Total Leads Generated</div>
                        <div className="text-5xl font-extrabold text-[#38B2AC] tracking-tight">{data?.stats.total_leads}</div>
                    </div>
                    <div className="soft-extruded soft-extruded-hover rounded-[32px] p-8">
                        <div className="text-[#6B7280] text-sm font-bold mb-3 uppercase tracking-wider">Monthly Ad Spend</div>
                        <div className="text-5xl font-extrabold text-[#3D4852] tracking-tight">${data?.stats.monthly_spend.toFixed(2)}</div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* User Details */}
                    <div className="soft-extruded rounded-[32px] p-8">
                        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                            <span className="w-10 h-10 rounded-2xl soft-inset flex items-center justify-center">
                                <User size={20} className="text-[#6C63FF]" />
                            </span>
                            User Details
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <div className="text-sm font-bold text-[#6B7280] mb-2">Email Address</div>
                                <div className="font-bold soft-inset p-4 rounded-2xl">{data?.user.email}</div>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-[#6B7280] mb-2">User ID</div>
                                <div className="font-mono text-xs font-bold soft-inset p-4 rounded-2xl text-[#6B7280] overflow-x-auto select-all">
                                    {data?.user.id}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tenant Plan */}
                    <div className="soft-extruded rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-6 right-6 opacity-5 select-none pointer-events-none">
                            <Building2 size={120} className="text-[#3D4852]" />
                        </div>
                        
                        <div>
                            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-2xl soft-inset flex items-center justify-center">
                                    <Building2 size={20} className="text-[#3D4852]" />
                                </span>
                                Workspace Plan
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="text-sm font-bold text-[#6B7280] mb-2">Current Tier</div>
                                    <div className="inline-block px-6 py-2.5 soft-btn-primary rounded-full text-sm font-extrabold uppercase tracking-widest shadow-md">
                                        {data?.tenant.plan}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-[#6B7280] mb-2">Account Created</div>
                                    <div className="font-bold text-[#3D4852] text-lg">
                                        {new Date(data?.tenant.created_at || "").toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
