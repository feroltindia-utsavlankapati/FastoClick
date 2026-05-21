import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import { FileText, UploadCloud, Brain, AlertCircle, Plus, Sparkles } from "lucide-react";

export default function CompanyContextPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<"knowledge" | "products">("knowledge");
    
    // manual context states
    const [formData, setFormData] = useState({
        link: "",
        focus: "",
        product_details: "",
        service_details: "",
        company_details: ""
    });
    const [hasDocuments, setHasDocuments] = useState(false);

    // products states
    const [products, setProducts] = useState<any[]>([]);
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [productForm, setProductForm] = useState({
        name: "",
        type: "product", // 'product' or 'service'
        description: "",
        target_audience: "",
        features: ""
    });
    
    const tenantId = "demo-tenant"; 

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
        }
    };

    const fetchProducts = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`http://localhost:8000/tenant/company/products/${tenantId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setProducts(data.data);
            }
        } catch (err) {
            console.error("Failed to load products", err);
        }
    };

    useEffect(() => {
        const initLoad = async () => {
            setLoading(true);
            await fetchContext();
            await fetchProducts();
            setLoading(false);
        };
        initLoad();
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
                alert("Details saved successfully! If you updated the website link, scraping has started in the background.");
                // Refresh context shortly after in case scraping updates empty fields quickly
                setTimeout(fetchContext, 3000);
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

    const handleSaveProduct = async () => {
        if (!productForm.name.trim()) {
            alert("Product name is required.");
            return;
        }

        const token = localStorage.getItem("token");
        const isEdit = !!editingProduct?.id;
        const url = isEdit 
            ? `http://localhost:8000/tenant/company/products/${editingProduct.id}`
            : "http://localhost:8000/tenant/company/products";
        const method = isEdit ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    ...productForm
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(isEdit ? "Product updated successfully!" : "Product created successfully!");
                setShowProductForm(false);
                setEditingProduct(null);
                setProductForm({ name: "", type: "product", description: "", target_audience: "", features: "" });
                fetchProducts();
            } else {
                alert("Failed to save product details.");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving product.");
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this product/service?")) return;
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`http://localhost:8000/tenant/company/products/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert("Product deleted successfully!");
                fetchProducts();
            } else {
                alert("Failed to delete product.");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting product.");
        }
    };

    return (
        <div className="min-h-screen bg-[#E0E5EC] text-[#3D4852] font-sans overflow-y-auto flex flex-col relative">
            <NavigationBar />
            
            {/* Visual Decoration */}
            <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full soft-inset pointer-events-none opacity-20 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full soft-extruded"></div>
            </div>

            <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-10 relative z-10">
                <header className="mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">Company Knowledge Base</h1>
                    <p className="text-[#6B7280] font-medium">Manage company knowledge and list specific products or services to fuel AI-driven strategies.</p>
                </header>

                {/* Sleek Neumorphic Tab switcher */}
                <div className="flex gap-6 mb-10 w-fit p-2 rounded-3xl soft-inset">
                    <button 
                        onClick={() => setActiveTab("knowledge")}
                        className={`px-6 py-2.5 rounded-2xl font-bold transition-all text-sm ${activeTab === "knowledge" ? "soft-btn-primary" : "text-[#6B7280] hover:text-[#3D4852]"}`}
                    >
                        Company Knowledge
                    </button>
                    <button 
                        onClick={() => setActiveTab("products")}
                        className={`px-6 py-2.5 rounded-2xl font-bold transition-all text-sm ${activeTab === "products" ? "soft-btn-primary" : "text-[#6B7280] hover:text-[#3D4852]"}`}
                    >
                        Products & Services
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin h-10 w-10 border-4 border-[#6C63FF] border-t-transparent rounded-full"></div>
                    </div>
                ) : activeTab === "knowledge" ? (
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
                                    <label className="block text-sm font-bold text-[#6B7280] mb-2">Website Link (Scrapes info in background)</label>
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
                ) : (
                    // Products & Services Tab
                    <div className="space-y-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <span className="w-10 h-10 rounded-2xl soft-inset flex items-center justify-center">
                                    <Sparkles size={18} className="text-[#6C63FF]" />
                                </span>
                                Manage Products & Services
                            </h2>
                            {!showProductForm && (
                                <button 
                                    onClick={() => {
                                        setEditingProduct(null);
                                        setProductForm({ name: "", type: "product", description: "", target_audience: "", features: "" });
                                        setShowProductForm(true);
                                    }}
                                    className="px-6 py-3 soft-btn-primary rounded-2xl font-bold text-sm flex items-center gap-2"
                                >
                                    <Plus size={16} /> Add Product/Service
                                </button>
                            )}
                        </div>

                        {showProductForm ? (
                            <div className="soft-extruded rounded-[32px] p-8 max-w-2xl mx-auto">
                                <h3 className="text-xl font-bold mb-6">
                                    {editingProduct ? `Edit ${editingProduct.name}` : "Add New Product or Service"}
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-[#6B7280] mb-2">Name</label>
                                        <input 
                                            type="text"
                                            value={productForm.name}
                                            onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                                            className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all font-medium"
                                            placeholder="e.g. Premium Analytics Platform"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-[#6B7280] mb-2">Type</label>
                                        <select 
                                            value={productForm.type}
                                            onChange={(e) => setProductForm({...productForm, type: e.target.value})}
                                            className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all font-bold"
                                        >
                                            <option value="product" className="bg-[#E0E5EC] text-[#3D4852]">Product</option>
                                            <option value="service" className="bg-[#E0E5EC] text-[#3D4852]">Service</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-[#6B7280] mb-2">Description</label>
                                        <textarea 
                                            value={productForm.description}
                                            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                                            className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all h-24 resize-none font-medium"
                                            placeholder="Overview and key value proposition..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-[#6B7280] mb-2">Target Audience</label>
                                        <textarea 
                                            value={productForm.target_audience}
                                            onChange={(e) => setProductForm({...productForm, target_audience: e.target.value})}
                                            className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all h-24 resize-none font-medium"
                                            placeholder="Ideal customers, demographics, and key paint points..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-[#6B7280] mb-2">Core Features / Pillars</label>
                                        <textarea 
                                            value={productForm.features}
                                            onChange={(e) => setProductForm({...productForm, features: e.target.value})}
                                            className="w-full soft-inset-deep bg-transparent rounded-2xl px-4 py-3 text-sm text-[#3D4852] placeholder-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC] transition-all h-24 resize-none font-medium"
                                            placeholder="Key features, modules, or core components..."
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <button 
                                            onClick={handleSaveProduct}
                                            className="flex-1 py-3.5 soft-btn-primary rounded-2xl font-bold transition-all"
                                        >
                                            Save Details
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowProductForm(false);
                                                setEditingProduct(null);
                                            }}
                                            className="flex-1 py-3.5 soft-btn rounded-2xl font-bold transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="soft-extruded rounded-[32px] p-12 text-center max-w-xl mx-auto flex flex-col justify-center items-center">
                                <Sparkles size={36} className="text-[#6B7280]/40 mb-4 animate-float" />
                                <h3 className="text-xl font-bold mb-2">No Products or Services Defined</h3>
                                <p className="text-[#6B7280] text-sm font-medium mb-6">
                                    Define specific products or services to allow generating highly targeted strategy plans, campaigns, and content ideas for them.
                                </p>
                                <button 
                                    onClick={() => setShowProductForm(true)}
                                    className="px-6 py-3 soft-btn-primary rounded-2xl font-bold text-sm"
                                >
                                    Add Your First Product
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {products.map((p) => (
                                    <div key={p.id} className="soft-extruded rounded-[32px] p-6 relative flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-xl font-bold text-[#3D4852]">{p.name}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.type === 'product' ? 'bg-[#6C63FF]/10 text-[#6C63FF]' : 'bg-[#38B2AC]/10 text-[#38B2AC]'}`}>
                                                    {p.type === 'product' ? 'Product' : 'Service'}
                                                </span>
                                            </div>
                                            {p.description && <p className="text-[#6B7280] text-sm font-medium mb-3 line-clamp-3 leading-relaxed">{p.description}</p>}
                                            {p.target_audience && (
                                                <div className="mb-2">
                                                    <span className="text-xs font-bold text-[#6B7280]">Audience: </span>
                                                    <span className="text-xs font-medium text-[#3D4852] line-clamp-2 leading-relaxed">{p.target_audience}</span>
                                                </div>
                                            )}
                                            {p.features && (
                                                <div className="mb-4">
                                                    <span className="text-xs font-bold text-[#6B7280]">Features: </span>
                                                    <span className="text-xs font-medium text-[#3D4852] line-clamp-2 leading-relaxed">{p.features}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-4 mt-6">
                                            <button 
                                                onClick={() => {
                                                    setEditingProduct(p);
                                                    setProductForm({
                                                        name: p.name,
                                                        type: p.type,
                                                        description: p.description || "",
                                                        target_audience: p.target_audience || "",
                                                        features: p.features || ""
                                                    });
                                                    setShowProductForm(true);
                                                }}
                                                className="flex-1 py-2 rounded-xl soft-btn font-bold text-sm transition-all"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteProduct(p.id)}
                                                className="flex-1 py-2 rounded-xl soft-btn hover:text-red-500 font-bold text-sm transition-all"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

