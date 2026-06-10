import { Target, Lightbulb, Mail, Activity, ArrowLeft, Loader2, Save, Plus, Edit2, Play, Ban } from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";

interface EmailProject {
    id: string;
    name: string;
    description: string;
    goals: string;
    target_audience: string;
    kpis: string;
    status: string;
}

interface EmailIdea {
    id: string;
    concept: string;
    status: string;
}

interface EmailCampaign {
    id: string;
    name: string;
    type: string;
    status: string;
    scheduled_at: string;
}

export default function EmailProjectDetailsPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('strategy');
    const [project, setProject] = useState<EmailProject | null>(null);
    const [ideas, setIdeas] = useState<EmailIdea[]>([]);
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal States
    const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [newIdeaData, setNewIdeaData] = useState({ concept: '' });
    const [newCampaignData, setNewCampaignData] = useState({ name: '', type: 'One-off', template_id: '', contact_ids: [] as string[] });

    useEffect(() => {
        if (projectId) {
            fetchProjectDetails();
            fetchIdeas();
            fetchCampaigns();
            fetchContacts();
        }
    }, [projectId]);

    const fetchContacts = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8000/email/contacts/?project_id=${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setContacts(data);
            }
        } catch (error) {
            console.error("Failed to fetch contacts:", error);
        }
    };

    const fetchProjectDetails = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8000/tenant/projects/${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setProject(data);
            }
        } catch (error) {
            console.error("Failed to fetch project:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchIdeas = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8000/email/ideas/project/${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setIdeas(data);
            }
        } catch (error) {
            console.error("Failed to fetch ideas:", error);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8000/email/campaigns/project/${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCampaigns(data);
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error);
        }
    };

    const handleSaveStrategy = async () => {
        if (!project) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem("token");
            await fetch(`http://localhost:8000/tenant/projects/${project.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(project)
            });
        } catch (error) {
            console.error("Failed to update project:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateIdea = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIdeaData.concept) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8000/email/ideas/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ concept: newIdeaData.concept, project_id: projectId, status: 'draft' })
            });
            if (response.ok) {
                const data = await response.json();
                setIdeas([...ideas, data]);
                setIsIdeaModalOpen(false);
                setNewIdeaData({ concept: '' });
            }
        } catch (error) {
            console.error("Failed to create idea:", error);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCampaignData.name) {
            alert("Please enter a Campaign Name before launching the builder.");
            return;
        }
        try {
            const token = localStorage.getItem("token");
            
            // Automatically select all contacts in the project for this campaign
            const allContactIds = contacts.map(c => c.id);
            if (allContactIds.length === 0) {
                alert("You have no contacts in this project. Please add contacts to the Email Bank first, or no emails will be sent.");
            }
            
            const response = await fetch(`http://localhost:8000/email/campaigns/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    project_id: projectId,
                    name: newCampaignData.name,
                    type: newCampaignData.type,
                    sender_email: "noreply@fastoclick.com",
                    template_id: newCampaignData.template_id || "default",
                    contact_ids: allContactIds
                })
            });
            if (response.ok) {
                const data = await response.json();
                setCampaigns([...campaigns, data]);
                setIsCampaignModalOpen(false);
                setNewCampaignData({ name: '', type: 'One-off', template_id: '', contact_ids: [] });
                // Launch builder by navigating to the email templates page
                window.location.href = `/projects/${projectId}/email/templates?new=true`;
            } else {
                const errText = await response.text();
                alert(`Error: Could not create campaign. Server responded with: ${response.status} ${errText}`);
            }
        } catch (error: any) {
            console.error("Failed to create campaign:", error);
            alert(`Network Error: ${error.message}`);
        }
    };

    const handleCancelCampaign = async (campaignId: string) => {
        if (!confirm("Are you sure you want to cancel this campaign?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8000/email/campaigns/${campaignId}/cancel`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                // Refresh campaigns
                fetchCampaigns();
            } else {
                const err = await response.json();
                alert(`Failed to cancel campaign: ${err.detail || JSON.stringify(err)}`);
            }
        } catch (error) {
            console.error("Failed to cancel campaign:", error);
        }
    };

    const tabs = [
        { id: 'strategy', label: 'Strategy', icon: <Target size={16} /> },
        { id: 'ideas', label: 'Idea Planning', icon: <Lightbulb size={16} /> },
        { id: 'campaigns', label: 'Campaign Builder', icon: <Mail size={16} /> },
        { id: 'analytics', label: 'Analytics', icon: <Activity size={16} /> },
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#E0E5EC] font-sans flex items-center justify-center text-[#6B7280]">
                <Loader2 className="animate-spin text-[#6C63FF]" size={40} />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-[#E0E5EC] font-sans flex items-center justify-center text-[#3D4852]">
                <div className="text-center">
                    <h2 className="text-2xl font-black mb-2">Project Not Found</h2>
                    <Link to={`/projects/${projectId}/email/dashboard`} className="text-[#6C63FF] hover:underline font-bold">Return to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <>
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <Link to={`/projects/${projectId}/email/dashboard`} className="w-10 h-10 rounded-2xl soft-btn flex items-center justify-center text-[#6B7280] hover:text-[#6C63FF] transition-all">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                                <span className="w-12 h-12 rounded-2xl soft-extruded flex items-center justify-center">
                                    <Target size={24} className="text-[#6C63FF]" />
                                </span>
                                {project.name}
                            </h1>
                            <p className="text-[#6B7280] mt-2 font-medium">{project.description || 'Manage campaigns, strategy, and analytics'}</p>
                        </div>
                    </div>
                </header>

                {/* Premium Tab Navigation */}
                <div className="flex flex-wrap items-center gap-2 mb-8 bg-[#E0E5EC]/50 soft-inset p-2 rounded-3xl w-max max-w-full">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300
                                ${activeTab === tab.id 
                                    ? 'soft-extruded text-[#6C63FF]' 
                                    : 'text-[#6B7280] hover:text-[#3D4852] hover:soft-btn'
                                }
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Content Area */}
                <div className="p-8 rounded-[32px] soft-extruded border border-white/50 backdrop-blur-md min-h-[400px]">
                    {activeTab === 'strategy' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-[#3D4852]">Campaign Strategy</h2>
                                    <p className="text-[#6B7280] font-medium text-sm">Define your project goals, target audience, and key performance indicators.</p>
                                </div>
                                <button 
                                    onClick={handleSaveStrategy}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6C63FF] text-white font-bold hover:bg-[#5A52D5] transition-colors shadow-lg disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    Save Strategy
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="font-bold text-[#3D4852] text-sm">Project Goals</label>
                                    <textarea 
                                        value={project.goals || ''}
                                        onChange={(e) => setProject({...project, goals: e.target.value})}
                                        className="w-full h-32 bg-[#E0E5EC] text-[#3D4852] p-4 rounded-2xl soft-inset border-none outline-none focus:ring-2 focus:ring-[#6C63FF]/50 transition-all resize-none placeholder:text-[#8B95A5]"
                                        placeholder="What are the primary objectives of this project?"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-bold text-[#3D4852] text-sm">Target Audience</label>
                                    <textarea 
                                        value={project.target_audience || ''}
                                        onChange={(e) => setProject({...project, target_audience: e.target.value})}
                                        className="w-full h-32 bg-[#E0E5EC] text-[#3D4852] p-4 rounded-2xl soft-inset border-none outline-none focus:ring-2 focus:ring-[#6C63FF]/50 transition-all resize-none placeholder:text-[#8B95A5]"
                                        placeholder="Who are we trying to reach? (e.g., Existing customers, VIPs)"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="font-bold text-[#3D4852] text-sm">Key Performance Indicators (KPIs)</label>
                                    <textarea 
                                        value={project.kpis || ''}
                                        onChange={(e) => setProject({...project, kpis: e.target.value})}
                                        className="w-full h-32 bg-[#E0E5EC] text-[#3D4852] p-4 rounded-2xl soft-inset border-none outline-none focus:ring-2 focus:ring-[#6C63FF]/50 transition-all resize-none placeholder:text-[#8B95A5]"
                                        placeholder="What metrics will define success? (e.g., 20% Open Rate, 5% CTR)"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'ideas' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-[#3D4852]">Idea & Content Planning</h2>
                                    <p className="text-[#6B7280] font-medium text-sm">Brainstorm email concepts and sequence planning.</p>
                                </div>
                                <button 
                                    onClick={() => setIsIdeaModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl soft-btn-primary font-bold transition-colors"
                                >
                                    <Plus size={16} /> New Idea
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ideas.length === 0 ? (
                                    <div className="col-span-full py-10 text-center text-[#6B7280]">
                                        <Lightbulb size={40} className="mx-auto mb-4 opacity-50" />
                                        <p className="font-bold">No ideas yet. Start brainstorming!</p>
                                    </div>
                                ) : (
                                    ideas.map(idea => (
                                        <div key={idea.id} className="p-5 rounded-2xl bg-[#E0E5EC] soft-inset border border-white/30 hover:border-[#6C63FF]/30 transition-all group">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-black text-[#3D4852] truncate pr-2">Idea Concept</h3>
                                                <button className="text-[#6B7280] hover:text-[#6C63FF] opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
                                            </div>
                                            <p className="text-sm text-[#6B7280] line-clamp-3">{idea.concept}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'campaigns' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-[#3D4852]">Campaign Builder</h2>
                                    <p className="text-[#6B7280] font-medium text-sm">Create, automate, and schedule your email sequences.</p>
                                </div>
                                <button 
                                    onClick={() => setIsCampaignModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl soft-btn-primary font-bold transition-colors"
                                >
                                    <Plus size={16} /> Build Campaign
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {campaigns.length === 0 ? (
                                    <div className="py-10 text-center text-[#6B7280]">
                                        <Mail size={40} className="mx-auto mb-4 opacity-50" />
                                        <p className="font-bold">No campaigns yet. Build your first one!</p>
                                    </div>
                                ) : (
                                    campaigns.map(camp => (
                                        <div key={camp.id} className="p-5 rounded-2xl bg-[#E0E5EC] soft-extruded flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl soft-inset flex items-center justify-center text-[#6C63FF]">
                                                    <Mail size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-[#3D4852]">{camp.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#EAB308]/10 text-[#EAB308]">{camp.type}</span>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#10B981]/10 text-[#10B981]">{camp.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Edit goes to template editor for that campaign's template */}
                                                <button onClick={() => window.location.href = `/projects/${projectId}/email/templates`} className="w-8 h-8 rounded-lg soft-btn flex items-center justify-center text-[#6C63FF]" title="View Templates"><Edit2 size={16} /></button>
                                                
                                                {/* Cancel Campaign */}
                                                {camp.status !== "cancelled" && camp.status !== "completed" && camp.status !== "failed" && (
                                                    <button onClick={() => handleCancelCampaign(camp.id)} className="w-8 h-8 rounded-lg soft-btn flex items-center justify-center text-[#DC2626]" title="Cancel Campaign"><Ban size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-black mb-4">Project Analytics</h2>
                            <p className="text-[#6B7280]">Track open rates, clicks, and conversions across all campaigns in this project.</p>
                            <div className="mt-6 flex flex-col items-center justify-center py-10 text-[#6B7280]">
                                <Activity size={40} className="mb-4 opacity-50 text-[#10B981]" />
                                <p className="font-bold">Analytics will populate once campaigns are active.</p>
                            </div>
                        </div>
                    )}
                </div>

            {/* Idea Modal */}
            {isIdeaModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D4852]/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#E0E5EC] p-8 rounded-[32px] max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-black mb-4">New Idea</h2>
                        <form onSubmit={handleCreateIdea} className="flex flex-col gap-4">
                            <textarea 
                                required value={newIdeaData.concept} onChange={e => setNewIdeaData({...newIdeaData, concept: e.target.value})}
                                placeholder="Describe your idea or concept..." className="w-full bg-[#E0E5EC] p-3 rounded-xl soft-inset font-bold outline-none h-32 resize-none"
                            />
                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsIdeaModalOpen(false)} className="flex-1 p-3 rounded-xl soft-btn font-bold text-[#6B7280]">Cancel</button>
                                <button type="submit" className="flex-1 p-3 rounded-xl soft-btn-primary font-bold">Save Idea</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Campaign Modal */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D4852]/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#E0E5EC] p-8 rounded-[32px] max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-black mb-4">Build Campaign</h2>
                        <form onSubmit={handleCreateCampaign} className="flex flex-col gap-4">
                            <input 
                                value={newCampaignData.name} onChange={e => setNewCampaignData({...newCampaignData, name: e.target.value})}
                                placeholder="Campaign Name" className="w-full bg-[#E0E5EC] p-3 rounded-xl soft-inset font-bold outline-none"
                            />
                            <select 
                                value={newCampaignData.type} onChange={e => setNewCampaignData({...newCampaignData, type: e.target.value})}
                                className="w-full bg-[#E0E5EC] p-3 rounded-xl soft-inset font-bold outline-none"
                            >
                                <option value="One-off">One-off Blast</option>
                                <option value="Automated Sequence">Automated Sequence</option>
                                <option value="A/B Test">A/B Test</option>
                            </select>
                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="flex-1 p-3 rounded-xl soft-btn font-bold">Cancel</button>
                                <button type="button" onClick={handleCreateCampaign} className="flex-1 p-3 rounded-xl soft-btn-primary font-bold">Launch Builder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
