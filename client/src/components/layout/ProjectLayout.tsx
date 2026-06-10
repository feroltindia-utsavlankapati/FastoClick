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
        <div className="min-h-screen bg-[#E0E5EC] text-[#3D4852] font-sans overflow-hidden flex flex-col">
            <NavigationBar />
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
                <Outlet />
            </main>
        </div>
    );
}
