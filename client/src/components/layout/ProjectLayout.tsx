import { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";

export default function ProjectLayout() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            navigate("/projects");
            return;
        }

        // Store active project in local storage for easy access across the app
        localStorage.setItem("active_project_id", projectId);
        
        setLoading(false);
    }, [projectId, navigate]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
            <NavigationBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
                <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 mt-16 md:mt-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
