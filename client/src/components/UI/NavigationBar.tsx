import { Link, useLocation } from "react-router-dom";
import { BarChart2, Brain, Bot, Settings, User, FileText, Lightbulb } from "lucide-react";

export default function NavigationBar() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const navLinks = [
        { path: "/dashboard",      label: "Dashboard", icon: <BarChart2 size={18} /> },
        { path: "/company-context",label: "Knowledge",  icon: <Brain size={18} /> },
        { path: "/agents",         label: "Agents",     icon: <Bot size={18} /> },
        { path: "/plans",          label: "Plans",      icon: <FileText size={18} /> },
        { path: "/content-ideas",  label: "Ideas",      icon: <Lightbulb size={18} /> },
        { path: "/workflows",      label: "Workflows",  icon: <Settings size={18} /> },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full bg-[#E0E5EC]/90 backdrop-blur-md border-b border-white/20 soft-transition">
            <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo / Brand */}
                <Link 
                    to="/dashboard" 
                    className="flex items-center gap-3 text-[#3D4852] font-extrabold text-xl tracking-tight focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] rounded-xl p-1"
                >
                    {/* <div className="w-10 h-10 rounded-2xl soft-extruded flex items-center justify-center text-xl animate-float">
                        <Zap size={20} className="text-[#6C63FF]" />
                    </div> */}
                    <span>
                        Marketing<span className="text-[#6C63FF]">OS</span>
                    </span>
                </Link>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-3 bg-[#E0E5EC] soft-inset p-1.5 rounded-[24px]">
                    {navLinks.map((link) => {
                        const active = isActive(link.path);
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]
                                    ${active 
                                        ? "soft-inset text-[#6C63FF]" 
                                        : "text-[#6B7280] hover:text-[#3D4852] hover:-translate-y-[1px]"
                                    }
                                `}
                            >
                                <span className={active ? "text-[#6C63FF]" : "text-[#6B7280]"}>{link.icon}</span>
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Profile / Actions */}
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl soft-btn flex items-center justify-center text-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6C63FF]">
                        <User size={20} className="text-[#3D4852]" />
                    </div>
                </div>
            </div>
        </nav>
    );
}
