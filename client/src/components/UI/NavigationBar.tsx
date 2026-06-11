import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
    BarChart2, Brain, Bot, Settings, User, FileText, Lightbulb, 
    Share2, CalendarDays, Image, TrendingUp, ChevronDown, 
    Sparkles, Menu, X, LogOut, ChevronRight, Mail, Users, PenTool, Activity, Braces
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
            icon: <Brain size={16} className="text-primary-600" />,
            items: [
                { path: "/company-context", label: "Knowledge Base", icon: <Brain size={18} className="text-primary-600" />, description: "Feed AI your company context & documents" },
                { path: "/agents", label: "AI Agents", icon: <Bot size={18} className="text-info" />, description: "Configure & deploy smart persona agents" },
                { path: "/workflows", label: "Workflows", icon: <Settings size={18} className="text-success" />, description: "Automate custom marketing pipelines" }
            ]
        },
        {
            id: "content-engine",
            label: "Content Engine",
            icon: <Sparkles size={16} className="text-danger" />,
            items: [
                { path: "/plans", label: "Marketing Plans", icon: <FileText size={18} className="text-danger" />, description: "Generate comprehensive marketing strategies" },
                { path: "/content-ideas", label: "Creative Ideas", icon: <Lightbulb size={18} className="text-warning" />, description: "Brainstorm viral topic ideas & hooks" },
                { path: "/media-library", label: "Media Library", icon: <Image size={18} className="text-pink-500" />, description: "Manage creative assets & attachments" }
            ]
        },
        {
            id: "social-hub",
            label: "Social Suite",
            icon: <Share2 size={16} className="text-purple-600" />,
            items: [
                { path: "/social", label: "Social Hub", icon: <Share2 size={18} className="text-purple-600" />, description: "Connect accounts & post scheduler" },
                { path: "/calendar", label: "Content Calendar", icon: <CalendarDays size={18} className="text-cyan-500" />, description: "Visual monthly scheduler & grid planner" },
                { path: "/social-analytics", label: "Analytics Hub", icon: <TrendingUp size={18} className="text-success" />, description: "Analyze follower growth & engagement metrics" }
            ]
        },
        {
            id: "email-marketing",
            label: "Email Marketing",
            icon: <Mail size={16} className="text-warning" />,
            items: [
                { path: "/email/contacts", label: "Contacts", icon: <Users size={18} className="text-info" />, description: "Manage contact lists & imports" },
                { path: "/email/templates", label: "Templates", icon: <PenTool size={18} className="text-pink-500" />, description: "Design email templates" },
                { path: "/email/campaigns", label: "Campaigns", icon: <Mail size={18} className="text-warning" />, description: "Schedule & send emails" },
                { path: "/email/analytics", label: "Analytics", icon: <Activity size={18} className="text-success" />, description: "Track opens, clicks & bounces" },
                { path: "/email/placeholders", label: "Placeholders", icon: <Braces size={18} className="text-purple-600" />, description: "View dynamic tags guide" }
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
            Object.values(dropdownTimeoutRef.current).forEach(clearTimeout);
        };
    }, []);

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
        <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm transition-smooth">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                
                {/* Logo / Brand */}
                <Link 
                    to="/dashboard" 
                    className="flex items-center gap-2 text-slate-900 font-bold text-lg tracking-tight focus-ring rounded-md shrink-0"
                >
                    <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                        F
                    </div>
                    Fasto<span className="text-primary-600">Click</span>
                </Link>

                {/* Desktop Grouped Navigation Links */}
                <div className="hidden md:flex items-center gap-1">
                    {/* Dashboard (Direct Link) */}
                    <Link
                        to="/dashboard"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-ring
                            ${isActive("/dashboard") 
                                ? "bg-slate-100 text-slate-900" 
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }
                        `}
                    >
                        <BarChart2 size={16} />
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
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-ring
                                        ${active 
                                            ? "text-primary-700 bg-primary-50" 
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                        }
                                        ${isOpen ? "bg-slate-100" : ""}
                                    `}
                                >
                                    {group.icon}
                                    <span>{group.label}</span>
                                    <ChevronDown 
                                        size={14} 
                                        className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-primary-600" : "text-slate-400"}`} 
                                    />
                                </button>

                                {/* Dropdown Menu Panel */}
                                {isOpen && (
                                    <div 
                                        className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex flex-col">
                                            {group.items.map((item) => {
                                                const itemActive = isActive(item.path);
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        onClick={() => setActiveDropdown(null)}
                                                        className={`flex items-start gap-3 px-4 py-2.5 transition-colors group
                                                            ${itemActive 
                                                                ? "bg-slate-50 text-primary-700" 
                                                                : "hover:bg-slate-50 text-slate-700"
                                                            }
                                                        `}
                                                    >
                                                        <span className="mt-0.5 shrink-0">
                                                            {item.icon}
                                                        </span>
                                                        <div className="flex flex-col gap-0.5 text-left">
                                                            <span className={`text-sm font-medium ${itemActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>{item.label}</span>
                                                            <span className="text-xs text-slate-500 leading-tight">{item.description}</span>
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer overflow-hidden border transition-colors focus-ring
                            ${isActive("/profile") ? "border-primary-500 ring-2 ring-primary-100" : "border-slate-200 hover:border-slate-300"}`}
                        title="View Profile Settings"
                    >
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-slate-600 bg-slate-100 w-full h-full flex items-center justify-center">
                                {username ? username.slice(0, 2).toUpperCase() : <User size={16} />}
                            </span>
                        )}
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-8 h-8 rounded flex items-center justify-center text-slate-500 hover:text-danger hover:bg-red-50 transition-colors focus-ring"
                        title="Sign Out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>

                {/* Mobile Menu Hamburger Trigger */}
                <div className="flex md:hidden items-center gap-2">
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="w-10 h-10 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 focus-ring"
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white">
                    <div className="flex flex-col px-4 py-2">
                        
                        {/* Direct Links */}
                        <Link
                            to="/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between py-3 px-2 rounded-md text-sm font-medium transition-colors
                                ${isActive("/dashboard") 
                                    ? "bg-slate-50 text-primary-600" 
                                    : "text-slate-700"
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <BarChart2 size={18} className={isActive("/dashboard") ? "text-primary-600" : "text-slate-500"} />
                                Dashboard
                            </span>
                        </Link>

                        {/* Accordion groups */}
                        {navGroups.map((group) => {
                            const active = isGroupActive(group);
                            const expanded = mobileExpandedGroup === group.id;

                            return (
                                <div key={group.id} className="flex flex-col border-t border-slate-100 mt-1 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setMobileExpandedGroup(expanded ? null : group.id)}
                                        className={`flex items-center justify-between py-3 px-2 rounded-md text-sm font-medium transition-colors
                                            ${active ? "text-primary-600 bg-slate-50" : "text-slate-700"}
                                        `}
                                    >
                                        <span className="flex items-center gap-2">
                                            {group.icon}
                                            {group.label}
                                        </span>
                                        <ChevronDown size={16} className={`transition-transform duration-200 text-slate-400 ${expanded ? "rotate-180" : ""}`} />
                                    </button>

                                    {/* Expanded Accordion Items */}
                                    {expanded && (
                                        <div className="flex flex-col pl-4 pb-2 animate-in fade-in duration-200">
                                            {group.items.map((item) => {
                                                const itemActive = isActive(item.path);
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={`flex items-center gap-3 py-2 px-2 rounded-md transition-colors
                                                            ${itemActive 
                                                                ? "text-primary-600 font-medium" 
                                                                : "text-slate-600"
                                                            }
                                                        `}
                                                    >
                                                        <span className="shrink-0">
                                                            {item.icon}
                                                        </span>
                                                        <span className="text-sm">{item.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Divider */}
                        <div className="h-px bg-slate-200 my-2"></div>

                        {/* Sign Out on Mobile */}
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                handleLogout();
                            }}
                            className="flex items-center gap-2 py-3 px-2 text-danger font-medium text-sm"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
