import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
    BarChart2, Brain, Bot, FileText, Lightbulb, 
    Share2, CalendarDays, Image, TrendingUp, ChevronDown, 
    Sparkles, Menu, LogOut, Mail, Users, PenTool, Activity, Braces,
    ChevronLeft, ChevronRight, User, FolderGit2, Plus
} from "lucide-react";

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
}

export default function NavigationBar({ isOpen, setIsOpen }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [username, setUsername] = useState<string>("");
    
    // Workspace Selection State
    const [projects, setProjects] = useState<any[]>([]);
    const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
    const activeProjectId = localStorage.getItem("active_project_id");

    useEffect(() => {
        const fetchUserNavbar = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/tenant/dashboard`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const json = await response.json();
                if (response.ok && json.success && json.data.user) {
                    setUsername(json.data.user.username || "");
                    setProfileImage(json.data.user.profile_image_url || null);
                }
            } catch (err) {
                console.error("Navbar failed to fetch user info:", err);
            }
        };

        const fetchProjects = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_API}/tenant/projects`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok) {
                    setProjects(data);
                    if (!activeProjectId && data.length > 0) {
                        localStorage.setItem("active_project_id", data[0].id);
                        window.location.reload();
                    }
                }
            } catch (err) {
                console.error("Navbar failed to fetch projects:", err);
            }
        };

        fetchUserNavbar();
        fetchProjects();
    }, [location.pathname]);

    const handleWorkspaceChange = (projectId: string) => {
        localStorage.setItem("active_project_id", projectId);
        setIsWorkspaceDropdownOpen(false);
        window.location.reload(); // Reload to refresh data for new workspace
    };

    const isActive = (path: string) => location.pathname === path;

    const navGroups = [
        {
            id: "ai-brain",
            label: "Brain & Agents",
            icon: <Brain size={18} className="text-primary-600 shrink-0" />,
            items: [
                { path: "/company-context", label: "Knowledge Base", icon: <Brain size={16} className="text-primary-600 shrink-0" /> },
                { path: "/agents", label: "AI Agents", icon: <Bot size={16} className="text-info shrink-0" /> }
            ]
        },
        {
            id: "content-engine",
            label: "Content Engine",
            icon: <Sparkles size={18} className="text-danger shrink-0" />,
            items: [
                { path: "/plans", label: "Marketing Plans", icon: <FileText size={16} className="text-danger shrink-0" /> },
                { path: "/content-ideas", label: "Creative Ideas", icon: <Lightbulb size={16} className="text-warning shrink-0" /> },
                { path: "/media-library", label: "Media Library", icon: <Image size={16} className="text-pink-500 shrink-0" /> }
            ]
        },
        {
            id: "social-hub",
            label: "Social Suite",
            icon: <Share2 size={18} className="text-purple-600 shrink-0" />,
            items: [
                { path: "/social", label: "Social Hub", icon: <Share2 size={16} className="text-purple-600 shrink-0" /> },
                { path: "/social/trends", label: "Trends Hub", icon: <TrendingUp size={16} className="text-indigo-500 shrink-0" /> },
                { path: "/calendar", label: "Content Calendar", icon: <CalendarDays size={16} className="text-cyan-500 shrink-0" /> },
                { path: "/social-analytics", label: "Analytics Hub", icon: <TrendingUp size={16} className="text-success shrink-0" /> }
            ]
        },
        {
            id: "email-marketing",
            label: "Email Marketing",
            icon: <Mail size={18} className="text-warning shrink-0" />,
            items: [
                { path: "/email/contacts", label: "Contacts", icon: <Users size={16} className="text-info shrink-0" /> },
                { path: "/email/templates", label: "Templates", icon: <PenTool size={16} className="text-pink-500 shrink-0" /> },
                { path: "/email/campaigns", label: "Campaigns", icon: <Mail size={16} className="text-warning shrink-0" /> },
                { path: "/email/analytics", label: "Analytics", icon: <Activity size={16} className="text-success shrink-0" /> },
                { path: "/email/placeholders", label: "Placeholders", icon: <Braces size={16} className="text-purple-600 shrink-0" /> }
            ]
        }
    ];

    const isGroupActive = (group: typeof navGroups[0]) => group.items.some(item => location.pathname === item.path);

    // Auto-expand group if an item is active
    useEffect(() => {
        if (!isOpen) {
            setExpandedGroup(null);
            return;
        }
        const activeGroup = navGroups.find(g => isGroupActive(g));
        if (activeGroup) {
            setExpandedGroup(activeGroup.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, isOpen]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/auth");
    };

    return (
        <aside 
            className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-50 flex flex-col transition-all duration-300 ${isOpen ? "w-64" : "w-16"} overflow-y-auto overflow-x-hidden`}
        >
            {/* Header & Logo */}
            <div className="h-16 flex items-center justify-between px-3 border-b border-slate-100 shrink-0">
                <Link to="/dashboard" className={`flex items-center gap-2 overflow-hidden transition-all ${isOpen ? 'w-full opacity-100' : 'w-0 opacity-0'}`}>
                    <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        F
                    </div>
                    <span className="text-slate-900 font-bold text-lg tracking-tight truncate shrink-0">
                        Fasto<span className="text-primary-600">Click</span>
                    </span>
                </Link>
                
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="w-10 h-10 shrink-0 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                >
                    {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Workspace Selector */}
            <div className="border-b border-slate-100 p-3 shrink-0 relative">
                <button
                    onClick={() => {
                        if (!isOpen) setIsOpen(true);
                        setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen);
                    }}
                    className={`w-full flex items-center rounded-md h-10 transition-colors border border-slate-200 hover:border-primary-300 hover:bg-slate-50
                        ${isOpen ? 'px-2 justify-between' : 'justify-center'}
                    `}
                    title={!isOpen ? "Workspaces" : undefined}
                >
                    <div className="flex items-center truncate">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <FolderGit2 size={14} className="text-primary-600" />
                        </div>
                        {isOpen && (
                            <span className="ml-2 text-sm font-bold text-slate-700 truncate">
                                {projects.find(p => p.id === activeProjectId)?.name || "Select Workspace"}
                            </span>
                        )}
                    </div>
                    {isOpen && <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />}
                </button>

                {/* Workspace Dropdown */}
                {isOpen && isWorkspaceDropdownOpen && (
                    <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 shadow-lg rounded-xl z-50 py-2 animate-in fade-in slide-in-from-top-1">
                        <div className="px-3 pb-2 mb-2 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Your Workspaces
                        </div>
                        <div className="max-h-48 overflow-y-auto px-1">
                            {projects.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => handleWorkspaceChange(project.id)}
                                    className={`w-full text-left px-2 py-2 rounded-md text-sm transition-colors flex items-center gap-2
                                        ${project.id === activeProjectId 
                                            ? "bg-primary-50 text-primary-700 font-semibold" 
                                            : "text-slate-700 hover:bg-slate-50"
                                        }
                                    `}
                                >
                                    <span className="truncate flex-1">{project.name}</span>
                                    {project.id === activeProjectId && <div className="w-1.5 h-1.5 rounded-full bg-primary-600"></div>}
                                </button>
                            ))}
                        </div>
                        <div className="px-1 mt-1 pt-1 border-t border-slate-100">
                            <Link 
                                to="/projects"
                                onClick={() => setIsWorkspaceDropdownOpen(false)}
                                className="w-full text-left px-2 py-2 rounded-md text-sm text-primary-600 hover:bg-primary-50 transition-colors flex items-center gap-2 font-medium"
                            >
                                <Plus size={14} /> Manage Workspaces
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Links */}
            <div className="flex-1 py-4 flex flex-col gap-1 px-3">
                <Link
                    to="/dashboard"
                    className={`flex items-center rounded-md transition-colors h-10 ${isOpen ? 'px-3' : 'justify-center'}
                        ${isActive("/dashboard") 
                            ? "bg-primary-50 text-primary-700" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }
                    `}
                    title={!isOpen ? "Dashboard" : undefined}
                >
                    <BarChart2 size={18} className="shrink-0" />
                    {isOpen && <span className="ml-3 font-medium text-sm truncate">Dashboard</span>}
                </Link>

                {navGroups.map((group) => {
                    const active = isGroupActive(group);
                    const expanded = expandedGroup === group.id && isOpen;

                    return (
                        <div key={group.id} className="flex flex-col">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isOpen) setIsOpen(true);
                                    setExpandedGroup(expanded ? null : group.id);
                                }}
                                className={`flex items-center justify-between rounded-md transition-colors h-10 mt-1
                                    ${isOpen ? 'px-3' : 'justify-center'}
                                    ${active ? "bg-slate-50 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"}
                                `}
                                title={!isOpen ? group.label : undefined}
                            >
                                <div className="flex items-center">
                                    {group.icon}
                                    {isOpen && <span className="ml-3 font-medium text-sm truncate">{group.label}</span>}
                                </div>
                                {isOpen && <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${expanded ? "rotate-180" : ""}`} />}
                            </button>

                            {/* Sub-items */}
                            {expanded && isOpen && (
                                <div className="flex flex-col mt-1 mb-1 pl-4 space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                    {group.items.map(item => {
                                        const itemActive = isActive(item.path);
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm
                                                    ${itemActive 
                                                        ? "text-primary-700 bg-primary-50 font-medium" 
                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                                    }
                                                `}
                                            >
                                                {item.icon}
                                                <span className="truncate">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Profile / Logout */}
            <div className="border-t border-slate-100 p-3 shrink-0 flex flex-col gap-2">
                <Link 
                    to="/profile" 
                    className={`flex items-center rounded-md h-10 transition-colors ${isOpen ? 'px-2 hover:bg-slate-50' : 'justify-center'}`}
                    title={!isOpen ? "Profile" : undefined}
                >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-slate-100 border border-slate-200">
                        {profileImage ? (
                            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-slate-600 text-xs font-bold uppercase">
                                {username ? username.slice(0, 2) : <User size={14} />}
                            </span>
                        )}
                    </div>
                    {isOpen && <span className="ml-3 text-sm font-medium text-slate-700 truncate">{username || "User"}</span>}
                </Link>

                <button
                    onClick={handleLogout}
                    className={`flex items-center rounded-md h-10 text-danger hover:bg-red-50 transition-colors ${isOpen ? 'px-2' : 'justify-center'}`}
                    title={!isOpen ? "Sign Out" : undefined}
                >
                    <LogOut size={18} className="shrink-0" />
                    {isOpen && <span className="ml-3 text-sm font-medium truncate">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
