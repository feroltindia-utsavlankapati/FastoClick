import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, Mail } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EmailCalendarPage() {
    const navigate = useNavigate();
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
            const response = await fetch(`http://localhost:8000/email/campaigns/project/${projectId}`, {
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

    const campaignsByDate: Record<string, any[]> = {};
    campaigns.forEach(c => {
        if (!c.scheduled_at && !c.created_at) return;
        const dateObj = new Date(c.scheduled_at || c.created_at);
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
        if (!campaignsByDate[dateStr]) campaignsByDate[dateStr] = [];
        campaignsByDate[dateStr].push({
            id: c.id,
            title: c.name,
            type: c.type,
            status: c.status,
            time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    function prevMonth() {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
        else setCurrentMonth(currentMonth - 1);
    }

    function nextMonth() {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
        else setCurrentMonth(currentMonth + 1);
    }

    function goToToday() {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    const selectedCampaigns = selectedDate ? (campaignsByDate[selectedDate] || []) : [];

    return (
        <>
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                <CalendarDays size={24} className="text-[#EAB308]" />
                            </span>
                            Email Calendar
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Visualize your scheduled email campaigns</p>
                    </div>
                    <button
                        onClick={() => navigate(`/projects/${projectId}/email/campaigns`)}
                        className="px-5 py-2.5 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl text-sm font-bold flex items-center gap-2"
                    >
                        <Plus size={16} /> New Campaign
                    </button>
                </header>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-6">
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

                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {DAYS.map(day => (
                                    <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">{day}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays.map((day, i) => {
                                    if (day === null) return <div key={`empty-${i}`} className="min-h-[80px]"></div>;
                                    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const hasCampaigns = campaignsByDate[dStr] && campaignsByDate[dStr].length > 0;
                                    const isSelected = selectedDate === dStr;
                                    const isToday = todayStr === dStr;

                                    return (
                                        <div
                                            key={dStr}
                                            onClick={() => setSelectedDate(dStr === selectedDate ? null : dStr)}
                                            className={`bg-white border border-slate-200 hover:border-primary-500 transition-colors min-h-[100px] cursor-pointer flex flex-col p-2 ${isToday ? "today" : ""} ${isSelected ? "bg-slate-50 border border-slate-200 rounded-xl" : "hover:inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"}`}
                                        >
                                            <div className={`text-xs font-bold mb-1 ${isToday ? "text-primary-600" : "text-slate-500"}`}>{day}</div>
                                            {hasCampaigns && (
                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EAB308]"></div>
                                            )}
                                            {hasCampaigns && (
                                                <div className="hidden md:flex flex-col gap-1 mt-auto w-full">
                                                    {campaignsByDate[dStr].slice(0, 2).map((c, idx) => (
                                                        <div key={idx} className="text-[10px] truncate bg-white/50 px-1.5 py-0.5 rounded font-medium text-slate-900">
                                                            {c.title}
                                                        </div>
                                                    ))}
                                                    {campaignsByDate[dStr].length > 2 && (
                                                        <div className="text-[9px] text-slate-500 font-bold">+{campaignsByDate[dStr].length - 2} more</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6 sticky top-28">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Clock size={16} className="text-primary-600" />
                                {selectedDate
                                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                                    : "Select a Day"
                                }
                            </h3>

                            {!selectedDate ? (
                                <p className="text-sm text-[#9CA3AF]">Click a date on the calendar to view its scheduled emails.</p>
                            ) : selectedCampaigns.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-[#9CA3AF] mb-4">No emails scheduled for this day</p>
                                    <button onClick={() => navigate(`/projects/${projectId}/email/campaigns`)} className="px-4 py-2 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold">
                                        <Plus size={12} className="inline mr-1" /> Schedule Email
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedCampaigns.map((camp) => (
                                        <div key={camp.id} className="bg-slate-50 border border-slate-200 rounded-xl rounded-xl p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail size={14} className="text-[#EAB308]" />
                                                <p className="text-xs font-bold line-clamp-2">{camp.title}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-[#8B95A5]">{camp.type}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${camp.status === 'scheduled' ? 'bg-[#638DFF]/15 text-[#638DFF]' : 'bg-[#6B7280]/15 text-slate-500'}`}>
                                                    {camp.status}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-[#9CA3AF] mt-1">{camp.time}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
    );
}
