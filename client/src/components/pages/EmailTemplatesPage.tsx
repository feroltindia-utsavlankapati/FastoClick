import { useState, useEffect } from "react";
import { PenTool, Plus, Trash2, Edit3, Save, X, Eye, Code } from "lucide-react";

interface Template {
    id: string;
    name: string;
    subject: string;
    body_html: string;
    body_text: string;
}

export default function EmailTemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    
    const [currentTemplate, setCurrentTemplate] = useState<Partial<Template>>({
        name: "", subject: "", body_html: "", body_text: ""
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const projectId = localStorage.getItem("active_project_id") || "";
            const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/email/templates/?project_id=${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error("Failed to fetch templates", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentTemplate.name || !currentTemplate.subject) {
            alert("Name and Subject are required.");
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const projectId = localStorage.getItem("active_project_id") || "";
            const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/email/templates/`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ project_id: projectId, ...currentTemplate })
            });
            if (res.ok) {
                setIsEditing(false);
                fetchTemplates();
            } else {
                alert("Failed to save template.");
            }
        } catch (error) {
            console.error("Failed to save", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this template?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/email/templates/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setTemplates(templates.filter(t => t.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
                        
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 relative z-10 flex flex-col gap-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                <PenTool size={24} className="text-[#EC4899]" />
                            </span>
                            Email Templates
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Design and manage your email campaigns templates.</p>
                    </div>
                    {!isEditing && (
                        <button 
                            onClick={() => {
                                setCurrentTemplate({ name: "", subject: "", body_html: "", body_text: "" });
                                setIsEditing(true);
                            }}
                            className="px-6 py-3 rounded-2xl inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 font-bold shadow-md flex items-center gap-2"
                        >
                            <Plus size={18} /> New Template
                        </button>
                    )}
                </header>

                {isEditing ? (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-8 flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center border-b border-white/20 pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Edit3 size={20} className="text-[#EC4899]" /> {currentTemplate.id ? "Edit Template" : "Create Template"}
                            </h2>
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="p-2 rounded-xl inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 text-slate-500 hover:text-danger"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-500">Template Name</label>
                                <input 
                                    type="text" 
                                    value={currentTemplate.name}
                                    onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                                    className="p-4 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#EC4899]"
                                    placeholder="e.g. Welcome Email"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-500">Subject Line</label>
                                <input 
                                    type="text" 
                                    value={currentTemplate.subject}
                                    onChange={(e) => setCurrentTemplate({...currentTemplate, subject: e.target.value})}
                                    className="p-4 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#EC4899]"
                                    placeholder="e.g. Welcome to {{company_name}}!"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-slate-500 flex justify-between w-full pr-4">
                                    <span>HTML Body</span>
                                    <span className="font-normal text-xs">Available tags: {'{{first_name}}, {{last_name}}, {{email}}, {{company_name}}'}</span>
                                </label>
                                <div className="flex bg-slate-50 rounded-lg p-1 bg-slate-50 border border-slate-200 rounded-xl w-fit">
                                    <button
                                        onClick={() => setPreviewMode(false)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${!previewMode ? 'bg-white shadow-sm text-[#EC4899]' : 'text-slate-500 hover:text-slate-900'}`}
                                    >
                                        <Code size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => setPreviewMode(true)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${previewMode ? 'bg-white shadow-sm text-[#EC4899]' : 'text-slate-500 hover:text-slate-900'}`}
                                    >
                                        <Eye size={14} /> Preview
                                    </button>
                                </div>
                            </div>
                            
                            {previewMode ? (
                                <div className="p-4 bg-white rounded-2xl min-h-[400px] border border-white/40 shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-[#f3f4f6] px-4 py-2 border-b flex gap-2 items-center rounded-t-xl mb-2">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                        <span className="text-xs text-slate-500 font-mono ml-2">Preview Window</span>
                                    </div>
                                    <iframe 
                                        srcDoc={currentTemplate.body_html || "<div style='color: #9ca3af; font-family: sans-serif; text-align: center; margin-top: 2rem;'>No content</div>"} 
                                        title="Email Preview"
                                        className="w-full flex-1 border-none bg-white min-h-[350px]"
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            ) : (
                                <textarea 
                                    value={currentTemplate.body_html || ""}
                                    onChange={(e) => setCurrentTemplate({...currentTemplate, body_html: e.target.value})}
                                    className="p-4 bg-transparent bg-slate-50 border border-slate-200 rounded-xl rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899] min-h-[400px]"
                                    placeholder="<h1>Hello {{first_name}},</h1>..."
                                />
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={handleSave}
                                className="px-8 py-3 rounded-2xl inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 font-bold shadow-md flex items-center gap-2"
                            >
                                <Save size={18} /> Save Template
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loading ? (
                            <div className="col-span-full py-20 text-center text-slate-500 font-bold">Loading templates...</div>
                        ) : templates.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-slate-500 font-bold bg-slate-50 border border-slate-200 rounded-xl rounded-[32px]">
                                No templates found. Create your first one!
                            </div>
                        ) : (
                            templates.map(template => (
                                <div key={template.id} className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-6 flex flex-col justify-between group">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                                <PenTool size={18} className="text-[#EC4899]" />
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(template.id)}
                                                className="p-2 rounded-xl text-danger hover:bg-slate-50 border border-slate-200 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{template.name}</h3>
                                        <p className="text-sm text-slate-500 truncate font-medium mb-4">Subj: {template.subject}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setCurrentTemplate(template);
                                            setIsEditing(true);
                                        }}
                                        className="w-full py-2.5 rounded-xl inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-2 text-[#EC4899]"
                                    >
                                        <Edit3 size={16} /> Edit
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
