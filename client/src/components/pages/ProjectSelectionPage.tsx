import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderGit2, Plus, ArrowRight, Loader2 } from "lucide-react";

interface Project {
    id: string;
    name: string;
    description: string;
    created_at: string;
}

export default function ProjectSelectionPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    
    // Modal state for creating project
    const [isCreating, setIsCreating] = useState(false);
    const [newProject, setNewProject] = useState({ name: "", description: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/auth");
                return;
            }

            const response = await fetch("http://localhost:8000/tenant/projects", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || "Failed to fetch projects");
            }
            
            setProjects(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:8000/tenant/projects", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newProject)
            });
            
            if (!response.ok) throw new Error("Failed to create project");
            
            const created = await response.json();
            setProjects([created, ...projects]);
            setIsCreating(false);
            setNewProject({ name: "", description: "" });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectProject = (projectId: string) => {
        localStorage.setItem("active_project_id", projectId);
        navigate(`/projects/${projectId}/dashboard`);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 text-gray-900 font-extrabold text-xl tracking-tight">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center font-black text-xs text-blue-600">F</span>
                    Fasto<span className="text-blue-600">Click</span>
                </div>
                <button
                    onClick={() => {
                        localStorage.removeItem("token");
                        navigate("/auth");
                    }}
                    className="text-sm font-bold text-gray-600 hover:text-red-600 transition-colors"
                >
                    Sign Out
                </button>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-4xl w-full py-8">
                <div className="text-center mb-10">
                    <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
                        <FolderGit2 className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Select a Project Workspace</h1>
                    <p className="text-gray-500 text-lg">Every module and campaign operates within an isolated project</p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Create New Project Card */}
                        <div 
                            onClick={() => setIsCreating(true)}
                            className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all p-6 flex flex-col items-center justify-center cursor-pointer min-h-[220px] group"
                        >
                            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Create New Project</h3>
                            <p className="text-sm text-gray-500 mt-2 text-center">Start a new isolated workspace</p>
                        </div>

                        {/* Project Cards */}
                        {projects.map((project) => (
                            <div 
                                key={project.id}
                                onClick={() => selectProject(project.id)}
                                className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/5 transition-all p-6 flex flex-col cursor-pointer min-h-[220px] relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                                
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 truncate" title={project.name}>{project.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-3">
                                        {project.description || "No description provided."}
                                    </p>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
                                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                                    <ArrowRight className="w-4 h-4 text-blue-600 transform translate-x-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">New Project Workspace</h2>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newProject.name}
                                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g. Q3 Summer Marketing"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <textarea 
                                    value={newProject.description}
                                    onChange={e => setNewProject({...newProject, description: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                                    placeholder="What is this project about?"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </main>
        </div>
    );
}
