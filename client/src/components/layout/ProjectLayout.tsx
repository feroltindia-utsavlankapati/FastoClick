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

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            <NavigationBar />
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
                <Outlet />
            </main>
        </div>
    );
}
