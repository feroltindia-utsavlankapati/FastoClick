import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import { FileText, UploadCloud, Brain, AlertCircle } from "lucide-react";

export default function CompanyContextPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    const [formData, setFormData] = useState({
        link: "",
        focus: "",
        product_details: "",
        service_details: "",
        company_details: ""
    });
    
    const [hasDocuments, setHasDocuments] = useState(false);
    
    const tenantId = "demo-tenant"; 

    useEffect(() => {
        const fetchContext = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/auth");
                return;
            }
            
            try {
                const res = await fetch(`http://localhost:8000/tenant/company/context/${tenantId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data.success && data.data) {
                    setFormData({
                        link: data.data.link || "",
                        focus: data.data.focus || "",
                        product_details: data.data.product_details || "",
                        service_details: data.data.service_details || "",
                        company_details: data.data.company_details || ""
                    });
                    setHasDocuments(data.data.has_documents);
                }
            } catch (err) {
                console.error("Failed to load company context", err);
            } finally {
                setLoading(false);
            }
        };
        fetchContext();
    }, [navigate]);

    const handleSaveDetails = async () => {
        setSaving(true);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch("http://localhost:8000/tenant/company/context", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ tenant_id: tenantId, ...formData })
            });
            if (res.ok) {
                alert("Details saved successfully!");
            } else {
                alert("Failed to save details.");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving details.");
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.type !== "application/pdf") {
            alert("Please upload a PDF document.");
            return;
        }

        setUploading(true);
        const token = localStorage.getItem("token");
        const formDataPayload = new FormData();
        formDataPayload.append("tenant_id", tenantId);
        formDataPayload.append("file", file);

        try {
            const res = await fetch("http://localhost:8000/tenant/company/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formDataPayload
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setHasDocuments(true);
            } else {
                alert(data.detail || "Upload failed");
            }
        } catch (err) {
            console.error(err);
            alert("Error uploading document.");
        } finally {
            setUploading(false);
            e.target.value = ""; // Reset input
        }
    };

    return (
        <div className="min-h-screen bg-[#E0E5EC] text-[#3D4852] font-sans overflow-hidden flex flex-col relative">
            <NavigationBar />
            
            {/* Visual Decoration */}
            <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full soft-inset pointer-events-none opacity-20 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full soft-extruded"></div>
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-10 relative z-10">
                <header className="mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">Company Knowledge Base</h1>
                    <p className="text-[#6B7280] font-medium">Upload documents and provide details to give AI agents persistent context about your business.</p>
                </header>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin h-10 w-10 border-4 border-[#6C63FF] border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        
                        {/* Manual Entry Form */}
                        <div className="soft-extruded rounded-[32px] p-8">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-2xl soft-inset flex items-center justify-center">
                                    <FileText size={18} className="text-[#6C63FF]" />
                                </span> 
                                Manual Details
                            </h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[#6B7280] mb-2">Website Link</label>
                                    <input 
                                        type="url" 
                                        value={formData.link}
                                        onChange={(e) => setFormData({...formData, link: e.target.value})}
                                        className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all font-medium"
                                        placeholder="https://example.com"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-[#6B7280] mb-2">Primary Focus</label>
                                    <input 
                                        type="text" 
                                        value={formData.focus}
                                        onChange={(e) => setFormData({...formData, focus: e.target.value})}
                                        className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all font-medium"
                                        placeholder="e.g. B2B SaaS for Healthcare"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[#6B7280] mb-2">Product Details</label>
                                    <textarea 
                                        value={formData.product_details}
                                        onChange={(e) => setFormData({...formData, product_details: e.target.value})}
                                        className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all h-24 resize-none font-medium"
                                        placeholder="Describe your core products..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[#6B7280] mb-2">Service Details</label>
                                    <textarea 
                                        value={formData.service_details}
                                        onChange={(e) => setFormData({...formData, service_details: e.target.value})}
                                        className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all h-24 resize-none font-medium"
                                        placeholder="Describe your services..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[#6B7280] mb-2">General Company Details</label>
                                    <textarea 
                                        value={formData.company_details}
                                        onChange={(e) => setFormData({...formData, company_details: e.target.value})}
                                        className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all h-24 resize-none font-medium"
                                        placeholder="Mission, history, tone of voice..."
                                    />
                                </div>

                                <button 
                                    onClick={handleSaveDetails}
                                    disabled={saving}
                                    className="w-full py-3.5 soft-btn-primary rounded-2xl font-bold transition-all disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Details"}
                                </button>
                            </div>
                        </div>

                        {/* Document Upload Area */}
                        <div className="flex flex-col gap-8">
                            <div className="soft-extruded rounded-[32px] p-8 flex-1 flex flex-col justify-center items-center text-center">
                                <div className="w-24 h-24 rounded-full soft-inset-deep flex items-center justify-center mb-6 shadow-inner animate-float">
                                    <UploadCloud size={36} className="text-[#6C63FF]" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Upload Documents</h2>
                                <p className="text-[#6B7280] font-medium mb-8 max-w-sm">
                                    Upload PDFs containing pitch decks, brand guidelines, or strategy docs. The text will be extracted and injected into all AI workflows automatically.
                                </p>
                                
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        accept=".pdf"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                                    />
                                    <div className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${uploading ? 'soft-inset text-[#6B7280] cursor-not-allowed' : 'soft-btn focus:ring-2 focus:ring-[#6C63FF] cursor-pointer'}`}>
                                        {uploading ? "Extracting Text..." : "Select PDF File"}
                                    </div>
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className={`rounded-[32px] p-6 flex items-center justify-between transition-all ${hasDocuments ? 'soft-inset bg-[#38B2AC]/5' : 'soft-inset'}`}>
                                <div>
                                    <div className="font-extrabold text-lg mb-1">Knowledge Extracted</div>
                                    <div className="text-sm font-bold text-[#6B7280]">
                                        {hasDocuments ? 'Documents are currently providing context to AI agents.' : 'No documents uploaded yet.'}
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-2xl soft-inset flex items-center justify-center animate-float">
                                    {hasDocuments ? (
                                        <Brain size={24} className="text-[#38B2AC]" />
                                    ) : (
                                        <AlertCircle size={24} className="text-[#6B7280]" />
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
