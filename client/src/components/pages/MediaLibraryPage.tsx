import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Image as ImageIcon, Upload, Trash2, Filter, FileImage, FileVideo, X, Download } from "lucide-react";

const API = `${import.meta.env.VITE_BACKEND_API}`;

function getHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
}

function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function MediaLibraryPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [media, setMedia] = useState<any[]>([]);
    const [tenantId, setTenantId] = useState("");
    const [filter, setFilter] = useState("all");
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem("token");
            if (!token) { navigate("/auth"); return; }
            try {
                const res = await fetch(`${API}/tenant/dashboard`, {
                    headers: { ...getHeaders(), "Content-Type": "application/json" },
                });
                const json = await res.json();
                const tid = json.data?.tenant?.id || "";
                setTenantId(tid);
                await loadMedia(tid);
            } catch {} finally {
                setLoading(false);
            }
        };
        init();
    }, [navigate]);

    async function loadMedia(tid: string, type?: string) {
        if (!tid) return;
        const activeProjectId = localStorage.getItem("active_project_id");
        const queryParams = [];
        if (type && type !== "all") queryParams.push(`media_type=${type}`);
        if (activeProjectId) queryParams.push(`project_id=${activeProjectId}`);
        
        try {
            const url = queryParams.length > 0
                ? `${API}/social/media/${tid}?${queryParams.join("&")}`
                : `${API}/social/media/${tid}`;
            const res = await fetch(url, {
                headers: { ...getHeaders(), "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (json.success) setMedia(json.data || []);
        } catch {}
    }

    async function handleUpload(files: FileList | File[]) {
        if (!files || files.length === 0) return;
        setUploading(true);

        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("tenant_id", tenantId);
            const activeProjectId = localStorage.getItem("active_project_id");
            if (activeProjectId) formData.append("project_id", activeProjectId);

            try {
                const res = await fetch(`${API}/social/media/upload`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                    body: formData,
                });
                const json = await res.json();
                if (!json.success) {
                    setMessage({ text: json.detail || "Upload failed", type: "error" });
                }
            } catch (err: any) {
                setMessage({ text: "Upload failed: " + err.message, type: "error" });
            }
        }

        setMessage({ text: "Upload complete!", type: "success" });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
        setUploading(false);
        await loadMedia(tenantId, filter);
    }

    async function handleDelete(mediaId: string) {
        try {
            await fetch(`${API}/social/media/${mediaId}`, {
                method: "DELETE",
                headers: { ...getHeaders(), "Content-Type": "application/json" },
            });
            setMessage({ text: "Media deleted", type: "success" });
            setTimeout(() => setMessage({ text: "", type: "" }), 3000);
            await loadMedia(tenantId, filter);
        } catch {
            setMessage({ text: "Delete failed", type: "error" });
        }
    }

    function handleDrag(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
    }

    function handleFilterChange(f: string) {
        setFilter(f);
        loadMedia(tenantId, f);
    }

    const isImage = (mime: string) => mime?.startsWith("image/");
    const isVideo = (mime: string) => mime?.startsWith("video/");

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                <ImageIcon size={24} className="text-primary-600" />
                            </span>
                            Media Library
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            Upload and manage images & videos for your social posts
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 font-bold">{media.length} files</span>
                    </div>
                </header>

                {/* Notification */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-2xl font-bold text-sm ${
                        message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* Upload Zone */}
                <div
                    className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-200 mb-8 relative ${
                        dragActive 
                        ? "border-primary-500 bg-primary-50/50 shadow-inner scale-[0.99]" 
                        : "border-slate-300 hover:border-primary-400 bg-slate-50 hover:bg-slate-100"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ cursor: "pointer" }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={e => e.target.files && handleUpload(e.target.files)}
                    />
                    {uploading ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-8">
                            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
                            <span className="font-bold text-primary-600">Uploading your files...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center pointer-events-none py-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-200 ${dragActive ? 'bg-primary-100 text-primary-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                                <Upload size={32} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 text-slate-800">
                                {dragActive ? "Drop media files here to upload" : "Click or drag & drop media files here"}
                            </h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto">
                                Supports Images (JPG, PNG, GIF, WebP) and Videos (MP4, WebM) up to 100MB per file.
                            </p>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6">
                    {[
                        { key: "all", label: "All", icon: <Filter size={14} /> },
                        { key: "image", label: "Images", icon: <FileImage size={14} /> },
                        { key: "video", label: "Videos", icon: <FileVideo size={14} /> },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => handleFilterChange(f.key)}
                            className={`px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md text-xs flex items-center gap-1.5 ${filter === f.key ? "active" : ""}`}
                        >
                            {f.icon} {f.label}
                        </button>
                    ))}
                </div>

                {/* Media Grid */}
                {media.length === 0 ? (
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-12 text-center">
                        <ImageIcon size={48} className="mx-auto text-[#9CA3AF] mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Media Files</h3>
                        <p className="text-slate-500">Upload images and videos to use in your posts.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {media.map(item => (
                            <div key={item.id} className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[20px] overflow-hidden group">
                                {/* Thumbnail */}
                                <div className="aspect-square bg-slate-200 relative overflow-hidden">
                                    {isVideo(item.mime_type) ? (
                                        <video
                                            src={`${API}/social/media/file/${item.id}#t=0.1`}
                                            className="w-full h-full object-cover"
                                            preload="metadata"
                                            controls
                                        />
                                    ) : item.has_thumbnail || isImage(item.mime_type) ? (
                                        <img
                                            src={`${API}/social/media/thumbnail/${item.id}`}
                                            alt={item.original_filename}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={e => {
                                                (e.target as HTMLImageElement).src = "";
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FileVideo size={40} className="text-slate-400" />
                                        </div>
                                    )}

                                    {/* Type badge */}
                                    {isVideo(item.mime_type) && (
                                        <div className="absolute top-2 left-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 text-[10px]">
                                            VIDEO
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2 pointer-events-none">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 bg-white/90 rounded-lg shadow-sm hover:bg-white transition-colors pointer-events-auto"
                                        >
                                            <Trash2 size={16} className="text-danger" />
                                        </button>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <div className="font-bold text-xs truncate mb-1">
                                        {item.original_filename || item.filename}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-[#9CA3AF]">
                                        <span>{formatBytes(item.file_size_bytes || 0)}</span>
                                        {item.width && item.height && (
                                            <span>{item.width}×{item.height}</span>
                                        )}
                                        {item.duration_seconds && (
                                            <span>{Math.round(item.duration_seconds)}s</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
