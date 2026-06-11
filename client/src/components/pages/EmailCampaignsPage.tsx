import { useState, useEffect } from "react";
import { Mail, Plus, Play, Calendar, Users, X, Ban } from "lucide-react";
import NavigationBar from "../UI/NavigationBar";

interface Campaign {
    id: string;
    name: string;
    status: string;
    scheduled_at: string | null;
}

interface Template {
    id: string;
    name: string;
}

interface Contact {
    id: string;
    email: string;
    first_name: string | null;
}

export default function EmailCampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    const [newCampaign, setNewCampaign] = useState({
        name: "",
        template_id: "",
        sender_email: "",
        scheduled_at: "", // optional datetime-local
        contact_ids: [] as string[]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };
            
            const [campRes, tempRes, contRes] = await Promise.all([
                fetch("http://localhost:8000/email/campaigns/", { headers }),
                fetch("http://localhost:8000/email/templates/", { headers }),
                fetch("http://localhost:8000/email/contacts/", { headers })
            ]);
            
            if (campRes.ok) setCampaigns(await campRes.json());
            if (tempRes.ok) setTemplates(await tempRes.json());
            if (contRes.ok) setContacts(await contRes.json());
            
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCampaign.name || !newCampaign.template_id || newCampaign.contact_ids.length === 0) {
            alert("Name, template, and at least one contact are required.");
            return;
        }
        
        try {
            const token = localStorage.getItem("token");
            const payload = {
                ...newCampaign,
                scheduled_at: newCampaign.scheduled_at ? new Date(newCampaign.scheduled_at).toISOString() : null
            };
            
            const res = await fetch("http://localhost:8000/email/campaigns/", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                setIsCreating(false);
                fetchData();
            } else {
                alert("Failed to create campaign.");
            }
        } catch (error) {
            console.error("Failed to create", error);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Are you sure you want to terminate this campaign? No further emails will be sent.")) return;
        
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/email/campaigns/${id}/cancel`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (res.ok) {
                fetchData();
            } else {
                alert("Failed to terminate campaign.");
            }
        } catch (error) {
            console.error("Failed to cancel", error);
        }
    };

    const toggleContact = (id: string) => {
        setNewCampaign(prev => {
            if (prev.contact_ids.includes(id)) {
                return { ...prev, contact_ids: prev.contact_ids.filter(cid => cid !== id) };
            } else {
                return { ...prev, contact_ids: [...prev.contact_ids, id] };
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            <NavigationBar />
            
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 relative z-10 flex flex-col gap-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                <Mail size={24} className="text-[#EAB308]" />
                            </span>
                            Email Campaigns
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Create and track your email broadcasts and sequences.</p>
                    </div>
                    {!isCreating && (
                        <button 
                            onClick={() => {
                                setNewCampaign({ name: "", template_id: "", sender_email: "", scheduled_at: "", contact_ids: [] });
                                setIsCreating(true);
                            }}
                            className="px-6 py-3 rounded-2xl inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 font-bold shadow-md flex items-center gap-2"
                        >
                            <Plus size={18} /> New Campaign
                        </button>
                    )}
                </header>

                {isCreating ? (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center border-b border-white/20 pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Plus size={20} className="text-[#EAB308]" /> Create New Campaign
                            </h2>
                            <button 
                                onClick={() => setIsCreating(false)}
                                className="p-2 rounded-xl inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 text-slate-500 hover:text-danger"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-500">Campaign Name</label>
                                    <input 
                                        type="text" 
                                        value={newCampaign.name}
                                        onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                                        className="p-4 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#EAB308]"
                                        placeholder="e.g. Q4 Newsletter"
                                    />
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-500">Select Template</label>
                                    <select 
                                        value={newCampaign.template_id}
                                        onChange={(e) => setNewCampaign({...newCampaign, template_id: e.target.value})}
                                        className="p-4 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#EAB308] appearance-none"
                                    >
                                        <option value="">-- Choose a template --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-500">Sender Email ("From" Address)</label>
                                    <input 
                                        type="email" 
                                        value={newCampaign.sender_email}
                                        onChange={(e) => setNewCampaign({...newCampaign, sender_email: e.target.value})}
                                        className="p-4 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#EAB308]"
                                        placeholder="e.g. you@yourcompany.com"
                                    />
                                    <p className="text-xs text-slate-500">Leave blank to use default system email.</p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-500">Schedule (Optional)</label>
                                    <input 
                                        type="datetime-local" 
                                        value={newCampaign.scheduled_at}
                                        onChange={(e) => setNewCampaign({...newCampaign, scheduled_at: e.target.value})}
                                        className="p-4 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#EAB308]"
                                    />
                                    <p className="text-xs text-slate-500">Leave blank to send immediately.</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 h-[400px]">
                                <label className="text-sm font-bold text-slate-500 flex justify-between">
                                    <span>Select Contacts ({newCampaign.contact_ids.length} selected)</span>
                                    <button 
                                        onClick={() => setNewCampaign({...newCampaign, contact_ids: contacts.map(c => c.id)})}
                                        className="text-primary-600 hover:underline"
                                    >Select All</button>
                                </label>
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-4 overflow-y-auto flex flex-col gap-2">
                                    {contacts.length === 0 ? (
                                        <div className="text-sm text-slate-500 text-center mt-10">No contacts available.</div>
                                    ) : (
                                        contacts.map(c => (
                                            <div 
                                                key={c.id} 
                                                onClick={() => toggleContact(c.id)}
                                                className={`p-3 rounded-xl cursor-pointer border flex items-center justify-between transition-all ${newCampaign.contact_ids.includes(c.id) ? "border-[#EAB308] bg-slate-50/50 shadow-sm" : "border-transparent inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"}`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{c.first_name ? `${c.first_name}` : "—"}</span>
                                                    <span className="text-xs text-slate-500">{c.email}</span>
                                                </div>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${newCampaign.contact_ids.includes(c.id) ? "bg-[#EAB308] border-[#EAB308]" : "border-[#A0AEC0]"}`}>
                                                    {newCampaign.contact_ids.includes(c.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-white/20">
                            <button 
                                onClick={handleCreate}
                                className="px-8 py-3 rounded-2xl inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 font-bold shadow-md flex items-center gap-2"
                            >
                                <Play size={18} /> {newCampaign.scheduled_at ? "Schedule Campaign" : "Send Now"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loading ? (
                            <div className="col-span-full py-20 text-center text-slate-500 font-bold">Loading campaigns...</div>
                        ) : campaigns.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-slate-500 font-bold bg-slate-50 border border-slate-200 rounded-xl rounded-[32px]">
                                No campaigns found. Start your first campaign!
                            </div>
                        ) : (
                            campaigns.map(campaign => (
                                <div key={campaign.id} className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-6 flex flex-col justify-between h-48">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                                <Mail size={18} className="text-[#EAB308]" />
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                campaign.status === "completed" ? "bg-green-100 text-green-600" :
                                                campaign.status === "running" ? "bg-blue-100 text-blue-600" :
                                                campaign.status === "failed" ? "bg-red-100 text-red-600" :
                                                campaign.status === "cancelled" ? "bg-gray-100 text-gray-600" :
                                                "bg-yellow-100 text-yellow-600"
                                            }`}>
                                                {campaign.status}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{campaign.name}</h3>
                                        <p className="text-sm text-slate-500 truncate font-medium flex items-center gap-1">
                                            <Calendar size={12}/> {campaign.scheduled_at ? new Date(campaign.scheduled_at + (!campaign.scheduled_at.endsWith("Z") ? "Z" : "")).toLocaleString() : "Immediate"}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500 font-bold mt-4 pt-4 border-t border-white/20">
                                        <a href={`/email/analytics`} className="text-primary-600 hover:underline">View Analytics &rarr;</a>
                                        
                                        {(campaign.status === "running" || campaign.status === "scheduled") && (
                                            <button 
                                                onClick={() => handleCancel(campaign.id)}
                                                className="flex items-center gap-1 text-danger hover:text-red-700 transition-colors"
                                                title="Terminate Campaign"
                                            >
                                                <Ban size={14} /> Terminate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
