import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Eye, Heart, MessageCircle, Share, MousePointerClick, RefreshCw, ArrowUpRight, Sparkles, Lightbulb } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Area, AreaChart,
} from "recharts";

const API = `${import.meta.env.VITE_BACKEND_API}`;

import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube, FaTiktok, FaPinterest } from "react-icons/fa";

const PLATFORMS = [
    { key: "facebook", name: "Facebook", icon: <FaFacebook />, color: "#1877F2" },
    { key: "instagram", name: "Instagram", icon: <FaInstagram />, color: "#E1306C" },
    { key: "twitter", name: "X / Twitter", icon: <FaTwitter />, color: "#000000" },
    { key: "linkedin", name: "LinkedIn", icon: <FaLinkedin />, color: "#0A66C2" },
    { key: "youtube", name: "YouTube", icon: <FaYoutube />, color: "#FF0000" },
    { key: "tiktok", name: "TikTok", icon: <FaTiktok />, color: "#00F2EA" },
    { key: "pinterest", name: "Pinterest", icon: <FaPinterest />, color: "#E60023" },
];

function getHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
    };
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3 text-xs" style={{ background: "#E0E5EC" }}>
            <div className="font-bold mb-1">{label}</div>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold">{formatNumber(entry.value)}</span>
                </div>
            ))}
        </div>
    );
}
function formatInUserTimezone(isoString: string | null | undefined, formatType: "datetime" | "date" | "time" = "datetime") {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const tz = localStorage.getItem("user_timezone") || "UTC";
    
    try {
        if (formatType === "date") {
            return date.toLocaleDateString(undefined, { timeZone: tz, year: 'numeric', month: 'short', day: 'numeric' });
        }
        if (formatType === "time") {
            return date.toLocaleTimeString([], { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        }
        // datetime
        return date.toLocaleString(undefined, {
            timeZone: tz,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting date in timezone", tz, e);
        if (formatType === "date") return date.toLocaleDateString();
        if (formatType === "time") return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleString();
    }
}
export default function SocialAnalyticsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [flushing, setFlushing] = useState(false);
    const [syncError, setSyncError] = useState("");
    const [tenantId, setTenantId] = useState("");
    const [dateRange, setDateRange] = useState("30d");
    const [platformFilter, setPlatformFilter] = useState("all");

    const [overview, setOverview] = useState<any>({});
    const [byPlatform, setByPlatform] = useState<Record<string, any>>({});
    const [timeline, setTimeline] = useState<any[]>([]);
    const [topPosts, setTopPosts] = useState<any[]>([]);
    const [insights, setInsights] = useState<any[]>([]);
    const [loadingInsights, setLoadingInsights] = useState(false);

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem("token");
            if (!token) { navigate("/auth"); return; }
            try {
                const res = await fetch(`${API}/tenant/dashboard`, { headers: getHeaders() });
                const json = await res.json();
                const tid = json.data?.tenant?.id || "";
                setTenantId(tid);
                await Promise.all([
                    loadAnalytics(tid, dateRange, platformFilter),
                    loadTopPosts(tid, dateRange),
                    loadInsights(tid, dateRange)
                ]);
            } catch {} finally {
                setLoading(false);
            }
        };
        init();
    }, [navigate]);

    async function loadInsights(tid: string, range: string) {
        if (!tid) return;
        setLoadingInsights(true);
        const activeProjectId = localStorage.getItem("active_project_id");
        const query = activeProjectId ? `&project_id=${activeProjectId}` : "";
        try {
            const res = await fetch(`${API}/social/analytics/insights/${tid}?date_range=${range}${query}`, {
                headers: getHeaders(),
            });
            const json = await res.json();
            if (json.success) {
                setInsights(json.data || []);
            }
        } catch (e) {
            console.error("Failed to load insights", e);
        } finally {
            setLoadingInsights(false);
        }
    }

    async function loadAnalytics(tid: string, range: string, platform: string) {
        if (!tid) return;
        const activeProjectId = localStorage.getItem("active_project_id");
        const query = activeProjectId ? `&project_id=${activeProjectId}` : "";
        try {
            const url = platform && platform !== "all"
                ? `${API}/social/analytics/${tid}?date_range=${range}&platform=${platform}${query}`
                : `${API}/social/analytics/${tid}?date_range=${range}${query}`;
            const res = await fetch(url, { headers: getHeaders() });
            const json = await res.json();
            if (json.success) {
                setOverview(json.data?.overview || {});
                setByPlatform(json.data?.by_platform || {});
                setTimeline(json.data?.timeline || []);
            }
        } catch {}
    }

    async function loadTopPosts(tid: string, range: string) {
        if (!tid) return;
        const activeProjectId = localStorage.getItem("active_project_id");
        const query = activeProjectId ? `&project_id=${activeProjectId}` : "";
        try {
            const res = await fetch(`${API}/social/analytics/top-posts/${tid}?date_range=${range}${query}`, {
                headers: getHeaders(),
            });
            const json = await res.json();
            if (json.success) setTopPosts(json.data || []);
        } catch {}
    }

    async function handleSync() {
        setSyncing(true);
        setSyncError("");
        try {
            const res = await fetch(`${API}/social/analytics/sync/${tenantId}`, {
                method: "POST",
                headers: getHeaders(),
            });
            const json = await res.json();
            if (!json.success) setSyncError(json.detail || "Sync failed");
            await Promise.all([
                loadAnalytics(tenantId, dateRange, platformFilter),
                loadTopPosts(tenantId, dateRange),
                loadInsights(tenantId, dateRange)
            ]);
        } catch (e: any) {
            setSyncError(e?.message || "Sync failed");
        } finally {
            setSyncing(false);
        }
    }

    async function handleFlushSync() {
        if (!window.confirm("This will delete all cached analytics for your account and re-fetch fresh data from the platforms. Continue?")) return;
        setFlushing(true);
        setSyncError("");
        try {
            const res = await fetch(`${API}/social/analytics/flush-sync/${tenantId}`, {
                method: "POST",
                headers: getHeaders(),
            });
            const json = await res.json();
            if (!json.success) setSyncError(json.detail || "Flush failed");
            await Promise.all([
                loadAnalytics(tenantId, dateRange, platformFilter),
                loadTopPosts(tenantId, dateRange),
                loadInsights(tenantId, dateRange)
            ]);
        } catch (e: any) {
            setSyncError(e?.message || "Flush failed");
        } finally {
            setFlushing(false);
        }
    }

    function handleDateRangeChange(range: string) {
        setDateRange(range);
        loadAnalytics(tenantId, range, platformFilter);
        loadTopPosts(tenantId, range);
        loadInsights(tenantId, range);
    }

    function handlePlatformChange(platform: string) {
        setPlatformFilter(platform);
        loadAnalytics(tenantId, dateRange, platform);
    }

    // Build bar chart data from byPlatform
    const platformBarData = Object.values(byPlatform).map((bp: any) => ({
        name: bp.platform_name || bp.platform,
        impressions: bp.impressions || 0,
        reach: bp.reach || 0,
        engagement: (bp.likes || 0) + (bp.comments || 0) + (bp.shares || 0),
    }));

    // Overview stat cards
    const statCards = [
        { label: "Impressions", value: overview.total_impressions || 0, icon: <Eye size={20} />, color: "#6C63FF" },
        { label: "Reach", value: overview.total_reach || 0, icon: <TrendingUp size={20} />, color: "#38B2AC" },
        { label: "Likes", value: overview.total_likes || 0, icon: <Heart size={20} />, color: "#E53E3E" },
        { label: "Comments", value: overview.total_comments || 0, icon: <MessageCircle size={20} />, color: "#D69E2E" },
        { label: "Shares", value: overview.total_shares || 0, icon: <Share size={20} />, color: "#3182CE" },
        { label: "Clicks", value: overview.total_clicks || 0, icon: <MousePointerClick size={20} />, color: "#805AD5" },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                <TrendingUp size={24} className="text-primary-600" />
                            </span>
                            Social Analytics
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            Track performance across all your social platforms
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                            <button
                                onClick={handleSync}
                                disabled={syncing || flushing}
                                className="px-4 py-2.5 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-sm font-bold flex items-center gap-2"
                            >
                                <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
                                {syncing ? "Syncing..." : "Sync"}
                            </button>
                            <button
                                onClick={handleFlushSync}
                                disabled={syncing || flushing}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-slate-800 text-white hover:bg-slate-900 transition-colors disabled:bg-slate-300 disabled:text-slate-500 shadow-sm"
                                title="Delete stale analytics and re-fetch fresh data from platforms"
                            >
                                <RefreshCw size={15} className={flushing ? "animate-spin" : ""} />
                                {flushing ? "Refreshing..." : "Clear & Resync"}
                            </button>
                        </div>
                        {syncError && (
                            <p className="text-xs text-danger font-semibold">{syncError}</p>
                        )}
                    </div>
                </header>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    {/* Date Range */}
                    <div className="flex gap-2">
                        {["7d", "30d", "90d", "1y"].map(r => (
                            <button
                                key={r}
                                onClick={() => handleDateRangeChange(r)}
                                className={`px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md text-xs ${dateRange === r ? "active" : ""}`}
                            >
                                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r === "90d" ? "90 Days" : "1 Year"}
                            </button>
                        ))}
                    </div>

                    {/* Platform Filter */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => handlePlatformChange("all")}
                            className={`px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md text-xs ${platformFilter === "all" ? "active" : ""}`}
                        >
                            All Platforms
                        </button>
                        {PLATFORMS.map(p => (
                            <button
                                key={p.key}
                                onClick={() => handlePlatformChange(p.key)}
                                className={`px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md text-xs ${platformFilter === p.key ? "active" : ""}`}
                            >
                                {p.icon} {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {statCards.map(card => (
                        <div key={card.label} className="bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span style={{ color: card.color }}>{card.icon}</span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                            </div>
                            <div className="text-2xl font-extrabold" style={{ color: card.color }}>
                                {formatNumber(card.value)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Insights and Engagement Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Left: Engagement Rate Card */}
                    <div className="lg:col-span-1 flex flex-col">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Average Engagement Rate</div>
                                <div className="text-4xl font-extrabold text-primary-600 mb-2">
                                    {(overview.avg_engagement_rate || 0).toFixed(2)}%
                                </div>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    This represents the average engagement level across all active posts on Facebook, Instagram, X/Twitter, LinkedIn, and other channels.
                                </p>
                            </div>
                            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
                                <span className="text-xs font-bold text-slate-500">Status</span>
                                <span className="px-2.5 py-1 text-[10px] font-bold text-success bg-success/10 rounded-full flex items-center gap-1">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: AI Performance Insights */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col">
                        <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                <Sparkles size={18} className="text-[#805AD5]" />
                            </span>
                            AI Performance Insights
                        </h3>

                        {loadingInsights ? (
                            <div className="space-y-4 flex-1 flex flex-col justify-center">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="p-4 bg-slate-50 border border-slate-200 rounded-xl animate-pulse space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="h-4 bg-[#A3B1C6]/40 rounded w-1/3"></div>
                                            <div className="h-4 bg-[#A3B1C6]/40 rounded w-16"></div>
                                        </div>
                                        <div className="h-3 bg-[#A3B1C6]/40 rounded w-5/6"></div>
                                        <div className="h-3 bg-[#A3B1C6]/30 rounded w-4/6 mt-2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : insights.length === 0 ? (
                            <div className="text-center py-8 text-[#9CA3AF] text-sm flex-1 flex items-center justify-center">
                                No insights available yet. Click "Sync Analytics" or publish posts to generate performance insights.
                            </div>
                        ) : (
                            <div className="space-y-4 flex-1">
                                {insights.map((insight, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:scale-[1.01] transition-transform duration-300">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <h4 className="font-bold text-sm text-[#2D3748] flex items-center gap-1.5">
                                                <Lightbulb size={14} className="text-[#D69E2E] flex-shrink-0" />
                                                {insight.title}
                                            </h4>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                insight.impact === "HIGH" 
                                                    ? "bg-[#FEE2E2] text-[#EF4444]" 
                                                    : insight.impact === "MEDIUM" 
                                                    ? "bg-[#FEF3C7] text-[#D97706]" 
                                                    : "bg-[#DBEAFE] text-[#2563EB]"
                                            }`}>
                                                {insight.impact} IMPACT
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#718096] leading-relaxed mb-3">
                                            {insight.description}
                                        </p>
                                        {insight.action && (
                                            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/60 border border-[#A3B1C6]/20">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-primary-600 bg-[#EEF2F6] px-1.5 py-0.5 rounded-md">
                                                    Action
                                                </span>
                                                <span className="text-[10px] text-[#4A5568] font-semibold">{insight.action}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Engagement Over Time */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                        <h3 className="font-bold mb-6">Engagement Over Time</h3>
                        {timeline.length === 0 ? (
                            <div className="h-60 flex items-center justify-center text-[#9CA3AF] text-sm">
                                No data available for the selected period
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={timeline}>
                                    <defs>
                                        <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#38B2AC" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#38B2AC" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10, fill: "#6B7280" }}
                                        tickFormatter={(v: string) => v.slice(5)}
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                                    <Area
                                        type="monotone"
                                        dataKey="engagement"
                                        stroke="#6C63FF"
                                        strokeWidth={2}
                                        fill="url(#colorEngagement)"
                                        name="Engagement"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="impressions"
                                        stroke="#38B2AC"
                                        strokeWidth={2}
                                        fill="url(#colorImpressions)"
                                        name="Impressions"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Performance by Platform */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                        <h3 className="font-bold mb-6">Performance by Platform</h3>
                        {platformBarData.length === 0 ? (
                            <div className="h-60 flex items-center justify-center text-[#9CA3AF] text-sm">
                                No platform data available
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={platformBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} />
                                    <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                                    <Bar dataKey="impressions" fill="#6C63FF" radius={[4, 4, 0, 0]} name="Impressions" />
                                    <Bar dataKey="reach" fill="#38B2AC" radius={[4, 4, 0, 0]} name="Reach" />
                                    <Bar dataKey="engagement" fill="#E53E3E" radius={[4, 4, 0, 0]} name="Engagement" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top Posts */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                            <ArrowUpRight size={16} className="text-[#059669]" />
                        </span>
                        Top Performing Posts
                    </h3>

                    {topPosts.length === 0 ? (
                        <div className="text-center py-8 text-[#9CA3AF] text-sm">
                            No published posts with analytics data yet. Sync analytics after publishing posts.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topPosts.map((post, i) => (
                                <div key={post.post_id} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center text-sm font-extrabold text-primary-600">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{post.caption || "Untitled post"}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {post.platforms?.map((p: any, j: number) => (
                                                <span key={j} className="text-xs">
                                                    {PLATFORMS.find(pp => pp.key === p.platform)?.icon}
                                                </span>
                                            ))}
                                            {post.published_at && (
                                                <span className="text-[10px] text-[#9CA3AF]">
                                                     {formatInUserTimezone(post.published_at, "date")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="text-center">
                                            <div className="font-extrabold text-primary-600">{formatNumber(post.total_engagement)}</div>
                                            <div className="text-[#9CA3AF]">Engagement</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-extrabold text-[#38B2AC]">{formatNumber(post.impressions)}</div>
                                            <div className="text-[#9CA3AF]">Impressions</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-extrabold">{formatNumber(post.reach)}</div>
                                            <div className="text-[#9CA3AF]">Reach</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
