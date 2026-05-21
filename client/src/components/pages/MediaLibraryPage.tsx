import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import { Image as ImageIcon, Upload, Trash2, Filter, FileImage, FileVideo, X, Download } from "lucide-react";

const API = "http://localhost:8000";

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
        try {
            const url = type && type !== "all"
                ? `${API}/social/media/${tid}?media_type=${type}`
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
            <div className="min-h-screen bg-[#E0E5EC] flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-[#6C63FF] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#E0E5EC] text-[#3D4852] font-sans flex flex-col">
            <NavigationBar />

            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl soft-extruded flex items-center justify-center">
                                <ImageIcon size={24} className="text-[#6C63FF]" />
                            </span>
                            Media Library
                        </h1>
                        <p className="text-[#6B7280] mt-2 font-medium">
                            Upload and manage images & videos for your social posts
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-[#6B7280] font-bold">{media.length} files</span>
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
                    className={`soft-dropzone mb-8 ${dragActive ? "active" : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
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
                        <div className="flex items-center justify-center gap-3">
                            <div className="animate-spin h-6 w-6 border-3 border-[#6C63FF] border-t-transparent rounded-full"></div>
                            <span className="font-bold text-[#6C63FF]">Uploading...</span>
                        </div>
                    ) : (
                        <div>
                            <Upload size={36} className="mx-auto text-[#6C63FF] mb-3" />
                            <p className="font-bold text-sm mb-1">
                                {dragActive ? "Drop files here" : "Drag & drop files here"}
                            </p>
                            <p className="text-xs text-[#9CA3AF]">
                                or click to browse • Images (JPG, PNG, GIF, WebP) • Videos (MP4, WebM) • Max 100MB
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
                            className={`soft-tab text-xs flex items-center gap-1.5 ${filter === f.key ? "active" : ""}`}
                        >
                            {f.icon} {f.label}
                        </button>
                    ))}
                </div>

                {/* Media Grid */}
                {media.length === 0 ? (
                    <div className="soft-extruded rounded-[32px] p-12 text-center">
                        <ImageIcon size={48} className="mx-auto text-[#9CA3AF] mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Media Files</h3>
                        <p className="text-[#6B7280]">Upload images and videos to use in your posts.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {media.map(item => (
                            <div key={item.id} className="soft-extruded rounded-[20px] overflow-hidden group">
                                {/* Thumbnail */}
                                <div className="aspect-square bg-[#d3d8df] relative overflow-hidden">
                                    {item.has_thumbnail || isImage(item.mime_type) ? (
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
                                            <FileVideo size={40} className="text-[#9CA3AF]" />
                                        </div>
                                    )}

                                    {/* Type badge */}
                                    {isVideo(item.mime_type) && (
                                        <div className="absolute top-2 left-2 soft-badge soft-badge-purple text-[10px]">
                                            VIDEO
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2.5 bg-white/90 rounded-xl hover:bg-white transition-colors"
                                        >
                                            <Trash2 size={16} className="text-red-500" />
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
