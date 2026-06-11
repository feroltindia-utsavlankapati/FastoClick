import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";

const API = "http://localhost:8000";

const PLATFORMS = [
    { key: "facebook", icon: "📘", color: "#1877F2" },
    { key: "instagram", icon: "📸", color: "#E1306C" },
    { key: "twitter", icon: "𝕏", color: "#000000" },
    { key: "linkedin", icon: "💼", color: "#0A66C2" },
    { key: "youtube", icon: "▶️", color: "#FF0000" },
    { key: "tiktok", icon: "🎵", color: "#00F2EA" },
    { key: "pinterest", icon: "📌", color: "#E60023" },
];

const STATUS_COLORS: Record<string, string> = {
    draft: "#6B7280",
    scheduled: "#638DFF",
    publishing: "#D97706",
    published: "#059669",
    failed: "#DC2626",
    retry_pending: "#D97706",
};

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
    };
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

function formatInUserTimezone(isoString: string | null | undefined, formatType: "datetime" | "date" | "time" | "calendar-date" = "datetime") {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const tz = localStorage.getItem("user_timezone") || "UTC";
    
    try {
        if (formatType === "calendar-date") {
            return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
        }
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
        if (formatType === "calendar-date") return isoString.slice(0, 10);
        if (formatType === "date") return date.toLocaleDateString();
        if (formatType === "time") return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleString();
    }
}

export default function ContentCalendarPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<any[]>([]);

    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem("token");
            if (!token) { navigate("/auth"); return; }
            try {
                const res = await fetch(`${API}/tenant/dashboard`, { headers: getHeaders() });
                const json = await res.json();
                const tid = json.data?.tenant?.id || "";
                await loadPosts(tid);
            } catch {} finally {
                setLoading(false);
            }
        };
        init();
    }, [navigate]);

    async function loadPosts(tid: string) {
        if (!tid) return;
        try {
            const res = await fetch(`${API}/social/posts/${tid}`, { headers: getHeaders() });
            const json = await res.json();
            if (json.success) setPosts(json.data || []);
        } catch {}
    }

    function prevMonth() {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    }

    function nextMonth() {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    }

    function goToToday() {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
    }

    // Group posts by date string
    const postsByDate: Record<string, any[]> = {};
    posts.forEach(post => {
        if (post.scheduled_at) {
            const dateStr = formatInUserTimezone(post.scheduled_at, "calendar-date");
            if (!postsByDate[dateStr]) postsByDate[dateStr] = [];
            postsByDate[dateStr].push(post);
        }
    });

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const todayStr = formatInUserTimezone(new Date().toISOString(), "calendar-date");

    // Build calendar grid
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    const selectedPosts = selectedDate ? (postsByDate[selectedDate] || []) : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            <NavigationBar />

            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                <CalendarDays size={24} className="text-primary-600" />
                            </span>
                            Content Calendar
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Visualize your scheduled posts across all platforms</p>
                    </div>
                    <button
                        onClick={() => navigate("/social")}
                        className="px-5 py-2.5 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl text-sm font-bold flex items-center gap-2"
                    >
                        <Plus size={16} /> New Post
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Calendar */}
                    <div className="lg:col-span-3">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-6">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-6">
                                <button onClick={prevMonth} className="p-3 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="text-center">
                                    <h2 className="text-2xl font-extrabold">{MONTHS[currentMonth]} {currentYear}</h2>
                                    <button onClick={goToToday} className="text-xs text-primary-600 font-bold hover:underline mt-1">
                                        Today
                                    </button>
                                </div>
                                <button onClick={nextMonth} className="p-3 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl">
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* Day Headers */}
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {DAYS.map(day => (
                                    <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays.map((day, i) => {
                                    if (day === null) {
                                        return <div key={`empty-${i}`} className="min-h-[80px]"></div>;
                                    }
                                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const dayPosts = postsByDate[dateStr] || [];
                                    const isToday = dateStr === todayStr;
                                    const isSelected = dateStr === selectedDate;

                                    return (
                                        <div
                                            key={dateStr}
                                            onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                                            className={`bg-white border border-slate-200 hover:border-primary-500 transition-colors ${isToday ? "today" : ""} ${isSelected ? "bg-slate-50 border border-slate-200 rounded-xl" : ""}`}
                                        >
                                            <div className={`text-xs font-bold mb-1 ${isToday ? "text-primary-600" : "text-slate-500"}`}>
                                                {day}
                                            </div>
                                            {dayPosts.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {dayPosts.slice(0, 3).map((post: any, j: number) => (
                                                        <div
                                                            key={j}
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: STATUS_COLORS[post.status] || "#6B7280" }}
                                                            title={`${post.status}: ${(post.caption || "").slice(0, 30)}`}
                                                        ></div>
                                                    ))}
                                                    {dayPosts.length > 3 && (
                                                        <span className="text-[8px] font-bold text-slate-500">+{dayPosts.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 flex-wrap">
                            {Object.entries(STATUS_COLORS).map(([status, color]) => (
                                <div key={status} className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                                    {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Side Panel — Selected Day */}
                    <div>
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6 sticky top-28">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Clock size={16} className="text-primary-600" />
                                {selectedDate
                                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                                        weekday: "long", month: "long", day: "numeric",
                                    })
                                    : "Select a Day"
                                }
                            </h3>

                            {!selectedDate ? (
                                <p className="text-sm text-[#9CA3AF]">Click a date on the calendar to view its posts.</p>
                            ) : selectedPosts.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-[#9CA3AF] mb-4">No posts scheduled for this day</p>
                                    <button
                                        onClick={() => navigate("/social")}
                                        className="px-4 py-2 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold"
                                    >
                                        <Plus size={12} className="inline mr-1" /> Add Post
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedPosts.map((post: any) => (
                                        <div key={post.id} className="bg-slate-50 border border-slate-200 rounded-xl rounded-xl p-3">
                                            <p className="text-xs font-bold mb-1 line-clamp-2">{post.caption || "Untitled"}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-1">
                                                    {post.platforms?.map((p: any, i: number) => (
                                                        <span key={i} className="text-xs">
                                                            {PLATFORMS.find(pp => pp.key === p.platform)?.icon}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span
                                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                    style={{
                                                        backgroundColor: `${STATUS_COLORS[post.status]}15`,
                                                        color: STATUS_COLORS[post.status],
                                                    }}
                                                >
                                                    {post.status}
                                                </span>
                                            </div>
                                            {post.scheduled_at && (
                                                <div className="text-[10px] text-[#9CA3AF] mt-1">
                                                    {formatInUserTimezone(post.scheduled_at, "time")}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
