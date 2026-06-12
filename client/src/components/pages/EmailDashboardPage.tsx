import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Users, Mail, MousePointerClick, Calendar } from "lucide-react";

export default function EmailDashboardPage() {
    const { projectId } = useParams();
    const [campaigns, setCampaigns] = useState<any[]>([]);

    useEffect(() => {
        if (projectId) {
            fetchCampaigns();
        }
    }, [projectId]);

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/email/campaigns/project/${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCampaigns(data);
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error);
        }
    };

    const stats = [
        { label: "Total Campaigns", value: campaigns.length.toString(), change: "+1", icon: <Mail size={20} />, color: "text-[#3B82F6]" },
        { label: "Open Rate", value: "32.4%", change: "+4.1%", icon: <Users size={20} />, color: "text-[#10B981]" },
        { label: "Click Rate", value: "14.2%", change: "+1.2%", icon: <MousePointerClick size={20} />, color: "text-[#8B5CF6]" },
        { label: "Conversion", value: "5.8%", change: "+0.8%", icon: <TrendingUp size={20} />, color: "text-[#EAB308]" }
    ];

    return (
        <>
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                <LayoutDashboard size={24} className="text-primary-600" />
                            </span>
                            Email Dashboard
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Unified overview of all your email activities</p>
                    </div>
                </header>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {stats.map((stat, i) => (
                        <div key={i} className="p-6 rounded-[32px] bg-white border border-slate-200 shadow-sm rounded-xl border border-white/50 backdrop-blur-md">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded-full">{stat.change}</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-500 mb-1">{stat.label}</h3>
                            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Recent Activity */}
                <div className="p-8 rounded-[32px] bg-white border border-slate-200 shadow-sm rounded-xl border border-white/50 backdrop-blur-md">
                    <h2 className="text-xl font-black mb-6">Recent Campaigns</h2>
                    {campaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                            <LayoutDashboard size={40} className="mb-4 text-[#8B95A5] opacity-50" />
                            <p className="font-bold">No recent campaigns to display.</p>
                            <p className="text-sm">Create a campaign to start sending emails.</p>
                            <Link to={`/projects/${projectId}/email/campaigns`} className="mt-4 px-6 py-2 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl font-bold">
                                Create Campaign
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.slice(0, 3).map((camp, i) => (
                                <div key={i} className="p-5 rounded-2xl bg-slate-50 bg-slate-50 border border-slate-200 rounded-xl border border-white/30 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center text-primary-600">
                                                <Mail size={18} />
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                                                camp.status === "completed" ? "bg-green-100 text-green-600" :
                                                camp.status === "running" ? "bg-blue-100 text-blue-600" :
                                                "bg-yellow-100 text-yellow-600"
                                            }`}>
                                                {camp.status}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-slate-900 mb-1 truncate">{camp.name}</h3>
                                        <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                                            <Calendar size={12}/> {camp.scheduled_at ? new Date(camp.scheduled_at + (!camp.scheduled_at.endsWith("Z") ? "Z" : "")).toLocaleString() : "Immediate"}
                                        </p>
                                    </div>
                                    <Link to={`/projects/${projectId}/email/campaigns`} className="mt-4 text-sm font-bold text-primary-600 hover:underline flex items-center gap-1">
                                        View Details
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
        </>
    );
}
