import { useState } from "react";
import { Outlet } from "react-router-dom";
import NavigationBar from "./NavigationBar";

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            {/* Sidebar Component handles its own styling and toggling internally based on props */}
            <NavigationBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'} overflow-y-auto`}>
                <Outlet />
            </div>
        </div>
    );
}
