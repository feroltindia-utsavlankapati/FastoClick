import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
    BarChart2, Brain, Bot, Settings, User, FileText, Lightbulb, 
    Share2, CalendarDays, Image, TrendingUp, ChevronDown, 
    Sparkles, Menu, X, LogOut, ChevronRight
} from "lucide-react";

export default function NavigationBar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [username, setUsername] = useState<string>("");
    const dropdownTimeoutRef = useRef<Record<string, any>>({});

    useEffect(() => {
        const fetchUserNavbar = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                const response = await fetch("http://localhost:8000/tenant/dashboard", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                const json = await response.json();
                if (response.ok && json.success && json.data.user) {
                    setUsername(json.data.user.username || "");
                    setProfileImage(json.data.user.profile_image_url || null);
                    if (json.data.user.timezone) {
                        localStorage.setItem("user_timezone", json.data.user.timezone);
                    }
                }
            } catch (err) {
                console.error("Navbar failed to fetch user info:", err);
            }
        };
        fetchUserNavbar();
    }, [location.pathname]);

    const isActive = (path: string) => location.pathname === path;

    const navGroups = [
        {
            id: "ai-brain",
            label: "Brain & Agents",
            icon: <Brain size={16} className="text-[#6C63FF]" />,
            items: [
                { path: "/company-context", label: "Knowledge Base", icon: <Brain size={18} className="text-[#6C63FF]" />, description: "Feed AI your company context & documents" },
                { path: "/agents", label: "AI Agents", icon: <Bot size={18} className="text-[#3B82F6]" />, description: "Configure & deploy smart persona agents" },
                { path: "/workflows", label: "Workflows", icon: <Settings size={18} className="text-[#10B981]" />, description: "Automate custom marketing pipelines" }
            ]
        },
        {
            id: "content-engine",
            label: "Content Engine",
            icon: <Sparkles size={16} className="text-[#EF4444]" />,
            items: [
                { path: "/plans", label: "Marketing Plans", icon: <FileText size={18} className="text-[#EF4444]" />, description: "Generate comprehensive marketing strategies" },
                { path: "/content-ideas", label: "Creative Ideas", icon: <Lightbulb size={18} className="text-[#F59E0B]" />, description: "Brainstorm viral topic ideas & hooks" },
                { path: "/media-library", label: "Media Library", icon: <Image size={18} className="text-[#EC4899]" />, description: "Manage creative assets & attachments" }
            ]
        },
        {
            id: "social-hub",
            label: "Social Suite",
            icon: <Share2 size={16} className="text-[#8B5CF6]" />,
            items: [
                { path: "/social", label: "Social Hub", icon: <Share2 size={18} className="text-[#8B5CF6]" />, description: "Connect accounts & post scheduler" },
                { path: "/calendar", label: "Content Calendar", icon: <CalendarDays size={18} className="text-[#06B6D4]" />, description: "Visual monthly scheduler & grid planner" },
                { path: "/social-analytics", label: "Analytics Hub", icon: <TrendingUp size={18} className="text-[#10B981]" />, description: "Analyze follower growth & engagement metrics" }
            ]
        }
    ];

    const isGroupActive = (group: typeof navGroups[0]) => {
        return group.items.some(item => location.pathname === item.path);
    };

    // Close dropdowns on outside clicks
    useEffect(() => {
        const handleOutsideClick = () => {
            setActiveDropdown(null);
        };
        document.addEventListener("click", handleOutsideClick);
        return () => {
            document.removeEventListener("click", handleOutsideClick);
            // clear any pending timers
            Object.values(dropdownTimeoutRef.current).forEach(clearTimeout);
        };
    }, []);

    // Handles delayed close to avoid jittery dropdown transitions
    const handleMouseEnter = (groupId: string) => {
        if (dropdownTimeoutRef.current[groupId]) {
            clearTimeout(dropdownTimeoutRef.current[groupId]);
        }
        setActiveDropdown(groupId);
    };

    const handleMouseLeave = (groupId: string) => {
        dropdownTimeoutRef.current[groupId] = setTimeout(() => {
            setActiveDropdown(current => current === groupId ? null : current);
        }, 150);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/auth");
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-[#E0E5EC]/90 backdrop-blur-md border-b border-white/20 soft-transition">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                
                {/* Logo / Brand */}
                <Link 
                    to="/dashboard" 
                    className="flex items-center gap-3 text-[#3D4852] font-extrabold text-xl tracking-tight focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] rounded-xl p-1 shrink-0"
                >
                    <span className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg soft-btn flex items-center justify-center font-black text-xs text-[#6C63FF] border border-white/40">F</span>
                        Fasto<span className="text-[#6C63FF]">Click</span>
                    </span>
                </Link>

                {/* Desktop Grouped Navigation Links */}
                <div className="hidden md:flex items-center gap-2 bg-[#E0E5EC]/50 soft-inset px-2 py-1.5 rounded-[24px]">
                    {/* Dashboard (Direct Link) */}
                    <Link
                        to="/dashboard"
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]
                            ${isActive("/dashboard") 
                                ? "soft-inset text-[#6C63FF]" 
                                : "text-[#6B7280] hover:text-[#3D4852] hover:-translate-y-[1px]"
                            }
                        `}
                    >
                        <BarChart2 size={15} />
                        Dashboard
                    </Link>

                    {/* Grouped Dropdowns */}
                    {navGroups.map((group) => {
                        const active = isGroupActive(group);
                        const isOpen = activeDropdown === group.id;

                        return (
                            <div 
                                key={group.id} 
                                className="relative"
                                onMouseEnter={() => handleMouseEnter(group.id)}
                                onMouseLeave={() => handleMouseLeave(group.id)}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdown(prev => prev === group.id ? null : group.id);
                                    }}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]
                                        ${active 
                                            ? "text-[#6C63FF] font-black" 
                                            : "text-[#6B7280] hover:text-[#3D4852]"
                                        }
                                        ${isOpen ? "soft-inset text-[#6C63FF]" : ""}
                                    `}
                                >
                                    {group.icon}
                                    <span>{group.label}</span>
                                    <ChevronDown 
                                        size={12} 
                                        className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-[#6C63FF]" : ""}`} 
                                    />
                                </button>

                                {/* Dropdown Menu Panel */}
                                {isOpen && (
                                    <div 
                                        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 bg-[#E0E5EC] rounded-[28px] p-4 soft-extruded border border-white/50 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 z-50"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Little arrow indicator */}
                                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#E0E5EC] rotate-45 border-l border-t border-white/50"></div>

                                        <div className="flex flex-col gap-1 relative z-10">
                                            {group.items.map((item) => {
                                                const itemActive = isActive(item.path);
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        onClick={() => setActiveDropdown(null)}
                                                        className={`flex items-start gap-3 p-3 rounded-2xl transition-all duration-300 group
                                                            ${itemActive 
                                                                ? "soft-inset text-[#6C63FF]" 
                                                                : "hover:soft-inset text-[#3D4852] hover:translate-x-0.5"
                                                            }
                                                        `}
                                                    >
                                                        <span className={`p-2 rounded-xl bg-[#E0E5EC] border border-white/30 shrink-0 
                                                            ${itemActive ? "soft-inset" : "soft-btn group-hover:soft-inset"}`}
                                                        >
                                                            {item.icon}
                                                        </span>
                                                        <div className="flex flex-col gap-0.5 text-left">
                                                            <span className="font-extrabold text-xs tracking-tight text-[#3D4852]">{item.label}</span>
                                                            <span className="text-[10px] text-[#6B7280] leading-snug font-medium">{item.description}</span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right profile / logout menu */}
                <div className="hidden md:flex items-center gap-3">
                    <Link 
                        to="/profile" 
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg cursor-pointer overflow-hidden border border-white/20 transition-all duration-300
                            ${isActive("/profile") ? "soft-inset" : "soft-btn hover:scale-[1.02]"}`}
                        title="View Profile Settings"
                    >
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-extrabold text-xs text-[#6C63FF] tracking-wider">
                                {username ? username.slice(0, 2).toUpperCase() : <User size={18} className="text-[#3D4852]" />}
                            </span>
                        )}
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 rounded-2xl soft-btn flex items-center justify-center text-red-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                        title="Sign Out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>

                {/* Mobile Menu Hamburger Trigger */}
                <div className="flex md:hidden items-center gap-2">
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="w-10 h-10 rounded-xl soft-btn flex items-center justify-center text-[#3D4852]"
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-x-0 top-20 bg-[#E0E5EC] border-b border-white/20 soft-extruded p-6 max-h-[calc(100vh-80px)] overflow-y-auto z-40 animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col gap-4">
                        
                        {/* Direct Links */}
                        <Link
                            to="/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all
                                ${isActive("/dashboard") 
                                    ? "soft-inset text-[#6C63FF]" 
                                    : "soft-btn text-[#6B7280]"
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <BarChart2 size={16} className={isActive("/dashboard") ? "text-[#6C63FF]" : "text-[#6B7280]"} />
                                Dashboard
                            </span>
                            <ChevronRight size={14} />
                        </Link>

                        {/* Accordion groups */}
                        {navGroups.map((group) => {
                            const active = isGroupActive(group);
                            const expanded = mobileExpandedGroup === group.id;

                            return (
                                <div key={group.id} className="flex flex-col gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setMobileExpandedGroup(expanded ? null : group.id)}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all
                                            ${active ? "text-[#6C63FF] bg-[#E0E5EC] border border-[#6C63FF]/20" : "soft-btn text-[#6B7280]"}
                                            ${expanded ? "soft-inset" : ""}
                                        `}
                                    >
                                        <span className="flex items-center gap-2">
                                            {group.icon}
                                            {group.label}
                                        </span>
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? "rotate-180 text-[#6C63FF]" : ""}`} />
                                    </button>

                                    {/* Expanded Accordion Items */}
                                    {expanded && (
                                        <div className="flex flex-col gap-1.5 pl-4 pr-1 py-1 animate-in fade-in duration-200">
                                            {group.items.map((item) => {
                                                const itemActive = isActive(item.path);
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all
                                                            ${itemActive 
                                                                ? "soft-inset text-[#6C63FF] font-black" 
                                                                : "hover:soft-inset text-[#3D4852]"
                                                            }
                                                        `}
                                                    >
                                                        <span className={`p-1.5 rounded-lg border border-white/20 shrink-0 ${itemActive ? "soft-inset" : "bg-[#E0E5EC]"}`}>
                                                            {item.icon}
                                                        </span>
                                                        <div className="flex flex-col">
                                                            <span className="font-extrabold text-[11px]">{item.label}</span>
                                                            <span className="text-[9px] text-[#8B95A5] truncate w-56">{item.description}</span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Divider */}
                        <div className="h-px bg-white/40 my-2"></div>

                        {/* Sign Out on Mobile */}
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                handleLogout();
                            }}
                            className="flex items-center gap-2 p-3.5 rounded-2xl soft-btn text-red-500 font-bold text-xs justify-center"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}

