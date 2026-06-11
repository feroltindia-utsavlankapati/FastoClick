import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { LibraryBig, Copy, Plus, X } from "lucide-react";

export default function EmailBankPage() {
    const { projectId } = useParams();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);

    useEffect(() => {
        if (projectId) {
            fetchTemplates();
        }
    }, [projectId]);

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8000/email/templates/?project_id=${projectId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        }
    };

    return (
        <>
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                <LibraryBig size={24} className="text-[#EC4899]" />
                            </span>
                            Email Bank
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Your central repository for all email templates and assets</p>
                    </div>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-5 py-2.5 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl text-sm font-bold flex items-center gap-2"
                    >
                        <Plus size={16} /> New Template
                    </button>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {templates.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-500 font-bold">
                            No templates available in the bank.
                        </div>
                    ) : templates.map((tpl, i) => (
                        <div key={i} className="p-4 rounded-[32px] bg-white border border-slate-200 shadow-sm rounded-xl border border-white/50 backdrop-blur-md group hover:translate-y-[-4px] transition-all">
                            <div className="w-full aspect-[4/3] rounded-2xl bg-slate-50 border border-slate-200 rounded-xl mb-4 flex flex-col relative overflow-hidden bg-white">
                                <div 
                                    className="w-[150%] h-[150%] p-2 scale-[0.65] origin-top-left pointer-events-none"
                                    dangerouslySetInnerHTML={{ __html: tpl.body_html || "<div style='color: #9ca3af; font-family: sans-serif; text-align: center;'>No content</div>" }}
                                />
                                {/* Overlay actions */}
                                <div className="absolute inset-0 bg-[#3D4852]/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors" title="Use Template">
                                        <Copy size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="px-2">
                                <h3 className="text-lg font-black text-slate-900 mb-1 truncate">{tpl.name}</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[#EC4899] bg-[#EC4899]/10 px-2 py-1 rounded-lg">Custom</span>
                                    <span className="text-xs font-bold text-[#8B95A5]">Template</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create Template Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D4852]/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-50 p-8 rounded-[32px] max-w-lg w-full shadow-2xl border border-white/50">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-slate-900">Create New Template</h2>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={(e) => { 
                                e.preventDefault(); 
                                setIsCreateModalOpen(false); 
                                // Launch builder by navigating to the email templates page
                                window.location.href = `/projects/${projectId}/email/templates?new=true`;
                            }} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">Template Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full bg-slate-50 text-slate-900 px-4 py-3 rounded-2xl border-none outline-none bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 transition-all font-bold placeholder:text-[#8B95A5]"
                                        placeholder="e.g. Winter Holiday Sale"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">Category</label>
                                    <select className="w-full bg-slate-50 text-slate-900 px-4 py-3 rounded-2xl border-none outline-none bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 transition-all font-bold appearance-none">
                                        <option>Promotional</option>
                                        <option>Newsletter</option>
                                        <option>Onboarding</option>
                                        <option>E-commerce</option>
                                    </select>
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
                                        className="flex-1 px-4 py-3 rounded-2xl inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 font-bold transition-colors"
                                    >
                                        Launch Builder
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </>
    );
}
