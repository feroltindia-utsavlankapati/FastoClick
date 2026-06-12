import { useState, useEffect } from "react";
import { Activity, Mail, MousePointerClick, CheckCircle, XCircle, TrendingUp, AlertTriangle } from "lucide-react";

interface Campaign {
    id: string;
    name: string;
}

interface Analytics {
    total_sent: number;
    total_delivered: number;
    total_opened: number;
    total_clicked: number;
    total_bounced: number;
    total_unsubscribed: number;
}

export default function EmailAnalyticsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        if (selectedCampaignId) {
            fetchAnalytics(selectedCampaignId);
        } else {
            setAnalytics(null);
        }
    }, [selectedCampaignId]);

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem("token");
            const projectId = localStorage.getItem("active_project_id") || "";
            const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/email/campaigns/?project_id=${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data);
                if (data.length > 0) {
                    setSelectedCampaignId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async (id: string) => {
        try {
            const token = localStorage.getItem("token");
            const projectId = localStorage.getItem("active_project_id") || "";
            const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/email/campaigns/${id}/analytics?project_id=${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setAnalytics(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        }
    };

    const calculateRate = (part: number, whole: number) => {
        if (!whole) return "0.0";
        return ((part / whole) * 100).toFixed(1);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
                        
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 relative z-10 flex flex-col gap-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                <Activity size={24} className="text-[#10B981]" />
                            </span>
                            Email Analytics
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Track the performance of your email campaigns.</p>
                    </div>
                    
                    <div className="w-full md:w-72">
                        <select 
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="w-full p-4 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#10B981] appearance-none"
                            disabled={loading || campaigns.length === 0}
                        >
                            {campaigns.length === 0 && <option value="">No campaigns available</option>}
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </header>

                {analytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Sent & Delivered */}
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold uppercase tracking-wider text-xs">
                                <Mail size={16} className="text-[#3B82F6]" /> Sent & Delivered
                            </div>
                            <div className="text-5xl font-extrabold text-slate-900">{analytics.total_sent}</div>
                            <div className="text-sm font-bold text-[#10B981] flex items-center gap-1 mt-2">
                                <CheckCircle size={14} /> {calculateRate(analytics.total_delivered, analytics.total_sent)}% Delivery Rate ({analytics.total_delivered})
                            </div>
                        </div>

                        {/* Open Rate */}
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold uppercase tracking-wider text-xs">
                                <TrendingUp size={16} className="text-[#10B981]" /> Open Rate
                            </div>
                            <div className="text-5xl font-extrabold text-[#10B981]">{calculateRate(analytics.total_opened, analytics.total_delivered)}%</div>
                            <div className="text-sm font-bold text-slate-500 mt-2">
                                {analytics.total_opened} Unique Opens
                            </div>
                        </div>

                        {/* Click Rate */}
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold uppercase tracking-wider text-xs">
                                <MousePointerClick size={16} className="text-[#8B5CF6]" /> Click Rate
                            </div>
                            <div className="text-5xl font-extrabold text-[#8B5CF6]">{calculateRate(analytics.total_clicked, analytics.total_opened)}%</div>
                            <div className="text-sm font-bold text-slate-500 mt-2">
                                {analytics.total_clicked} Clicks (Click-to-Open)
                            </div>
                        </div>

                        {/* Bounces */}
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold uppercase tracking-wider text-xs">
                                <AlertTriangle size={16} className="text-[#F59E0B]" /> Bounced
                            </div>
                            <div className="text-5xl font-extrabold text-[#F59E0B]">{analytics.total_bounced}</div>
                            <div className="text-sm font-bold text-slate-500 mt-2">
                                {calculateRate(analytics.total_bounced, analytics.total_sent)}% Bounce Rate
                            </div>
                        </div>

                        {/* Unsubscribes */}
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold uppercase tracking-wider text-xs">
                                <XCircle size={16} className="text-[#EF4444]" /> Unsubscribed
                            </div>
                            <div className="text-5xl font-extrabold text-[#EF4444]">{analytics.total_unsubscribed}</div>
                            <div className="text-sm font-bold text-slate-500 mt-2">
                                {calculateRate(analytics.total_unsubscribed, analytics.total_delivered)}% Unsubscribe Rate
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-[32px] p-20 flex items-center justify-center text-slate-500 font-bold text-lg">
                        {loading ? "Loading..." : "Select a campaign to view analytics"}
                    </div>
                )}
            </main>
        </div>
    );
}
