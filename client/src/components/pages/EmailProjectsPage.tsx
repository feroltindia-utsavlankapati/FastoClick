import { useState, useEffect } from "react";
import { Folder, Plus, Target, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface EmailProject {
    id: string;
    name: string;
    description: string;
    goals: string;
    status: string;
    created_at: string;
}

export default function EmailProjectsPage() {
    const [projects, setProjects] = useState<EmailProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectData, setNewProjectData] = useState({ name: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:8000/email/projects/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
            }
        } catch (error) {
            console.error("Failed to fetch projects:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectData.name) return;
        
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:8000/email/projects/", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: newProjectData.name,
                    description: newProjectData.description,
                    goals: "",
                    target_audience: "",
                    kpis: "",
                    status: "active"
                })
            });
            if (response.ok) {
                const newProject = await response.json();
                setProjects([...projects, newProject]);
                setIsCreateModalOpen(false);
                setNewProjectData({ name: '', description: '' });
            }
        } catch (error) {
            console.error("Error creating project:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                <Folder size={24} className="text-[#3B82F6]" />
                            </span>
                            Email Projects
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Manage your email marketing workspaces</p>
                    </div>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-5 py-2.5 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl text-sm font-bold flex items-center gap-2"
                    >
                        <Plus size={16} /> New Project
                    </button>
                </header>
                
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="animate-spin mb-4 text-primary-600" size={40} />
                        <p className="font-bold">Loading your workspaces...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 p-8 rounded-[32px] bg-white border border-slate-200 shadow-sm rounded-xl border border-white/50 backdrop-blur-md">
                        <div className="w-20 h-20 rounded-3xl inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center text-[#3B82F6] mb-6">
                            <Folder size={40} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">No projects found</h2>
                        <p className="mb-6 font-medium">Create your first project to start organizing campaigns.</p>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 rounded-2xl bg-primary-600 text-white font-bold hover:bg-[#5A52D5] transition-colors shadow-[0_10px_20px_rgba(108,99,255,0.3)]"
                        >
                            Create First Project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div key={project.id} className="p-6 rounded-[32px] bg-white border border-slate-200 shadow-sm rounded-xl border border-white/50 backdrop-blur-md group hover:translate-y-[-4px] transition-transform duration-300">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-[#3B82F6]">
                                        <Target size={24} />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${project.status === 'active' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#6B7280]/10 text-slate-500'}`}>
                                        {project.status.toUpperCase()}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2 truncate" title={project.name}>{project.name}</h3>
                                <p className="text-sm font-medium text-slate-500 mb-6 line-clamp-2 h-10">{project.description || 'No description provided.'}</p>
                                
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs font-bold text-[#8B95A5]">Created {new Date(project.created_at).toLocaleDateString()}</span>
                                    <Link 
                                        to={`/email/projects/${project.id}`} 
                                        className="w-10 h-10 rounded-2xl inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center text-primary-600 group-hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
                                    >
                                        <ArrowRight size={18} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D4852]/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-50 p-8 rounded-[32px] max-w-md w-full shadow-2xl border border-white/50">
                            <h2 className="text-2xl font-black text-slate-900 mb-6">Create New Project</h2>
                            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">Project Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newProjectData.name}
                                        onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                                        className="w-full bg-slate-50 text-slate-900 px-4 py-3 rounded-2xl border-none outline-none bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 transition-all font-bold placeholder:text-[#8B95A5]"
                                        placeholder="e.g. Summer Sale 2026"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">Description</label>
                                    <textarea 
                                        value={newProjectData.description}
                                        onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                                        className="w-full bg-slate-50 text-slate-900 px-4 py-3 rounded-2xl border-none outline-none bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 transition-all font-bold placeholder:text-[#8B95A5] min-h-[100px] resize-none"
                                        placeholder="What is the primary goal of this project?"
                                    />
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-2xl inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 font-bold text-slate-500 hover:text-slate-900 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isSubmitting || !newProjectData.name}
                                        className="flex-1 px-4 py-3 rounded-2xl bg-primary-600 text-white font-bold hover:bg-[#5A52D5] transition-colors shadow-[0_10px_20px_rgba(108,99,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Create Project'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </>
    );
}
