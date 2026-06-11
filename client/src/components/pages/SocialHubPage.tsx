import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import {
    Share2, Send, Clock, RefreshCw, Trash2, Eye, EyeOff,
    Check, X, AlertCircle, ChevronDown, ChevronUp, Zap, Shield,
    Upload
} from "lucide-react";

import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube, FaTiktok, FaPinterest } from "react-icons/fa";

const API = "http://localhost:8000";

const PLATFORMS = [
    { key: "facebook", name: "Facebook", icon: <FaFacebook />, color: "#1877F2" },
    { key: "instagram", name: "Instagram", icon: <FaInstagram />, color: "#E1306C" },
    { key: "twitter", name: "X / Twitter", icon: <FaTwitter />, color: "#000000" },
    { key: "linkedin", name: "LinkedIn", icon: <FaLinkedin />, color: "#0A66C2" },
    { key: "youtube", name: "YouTube", icon: <FaYoutube />, color: "#FF0000" },
    { key: "tiktok", name: "TikTok", icon: <FaTiktok />, color: "#00F2EA" },
    { key: "pinterest", name: "Pinterest", icon: <FaPinterest />, color: "#E60023" },
];

const STATUS_BADGES: Record<string, { class: string; label: string }> = {
    draft: { class: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600", label: "Draft" },
    scheduled: { class: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info", label: "Scheduled" },
    publishing: { class: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning", label: "Publishing" },
    published: { class: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success", label: "Published" },
    failed: { class: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/10 text-danger", label: "Failed" },
    retry_pending: { class: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning", label: "Retry Pending" },
};

function getHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
    };
}

function formatInUserTimezone(isoString: string | null | undefined, formatType: "datetime" | "date" | "time" = "datetime") {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const tz = localStorage.getItem("user_timezone") || "UTC";
    
    try {
        if (formatType === "date") {
            return date.toLocaleDateString(undefined, { timeZone: tz, year: 'numeric', month: 'short', day: 'numeric' });
        }
        if (formatType === "time") {
            return date.toLocaleTimeString([], { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        }
        // datetime
        return date.toLocaleString(undefined, {
            timeZone: tz,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting date in timezone", tz, e);
        if (formatType === "date") return date.toLocaleDateString();
        if (formatType === "time") return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleString();
    }
}

function getUtcString(localDateTimeStr: string, timeZone: string): string {
    const date = new Date(localDateTimeStr);
    if (isNaN(date.getTime())) return new Date().toISOString();
    
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(date);
        
        const tzMap: Record<string, string> = {};
        parts.forEach(p => tzMap[p.type] = p.value);
        
        const targetDateInUtc = new Date(Date.UTC(
            parseInt(tzMap.year),
            parseInt(tzMap.month) - 1,
            parseInt(tzMap.day),
            parseInt(tzMap.hour) === 24 ? 0 : parseInt(tzMap.hour),
            parseInt(tzMap.minute),
            parseInt(tzMap.second || "0")
        ));
        
        const diff = date.getTime() - targetDateInUtc.getTime();
        const correctDate = new Date(date.getTime() + diff);
        return correctDate.toISOString();
    } catch (e) {
        console.error("Error converting datetime to UTC for timezone", timeZone, e);
        return date.toISOString();
    }
}

export default function SocialHubPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);
    const [tenantId, setTenantId] = useState("");
    const [loading, setLoading] = useState(true);

    // Tab 1: Connected Accounts
    const [accounts, setAccounts] = useState<any[]>([]);

    // Tab 2: Create Post
    const [caption, setCaption] = useState("");
    const [hashtags, setHashtags] = useState("");
    const [mentions, setMentions] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [scheduledAt, setScheduledAt] = useState("");
    const [postTimezone, setPostTimezone] = useState("UTC");
    const [attachedMedia, setAttachedMedia] = useState<any[]>([]);
    const [customPlatformPostIds, setCustomPlatformPostIds] = useState<Record<string, string>>({});
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [libraryMedia, setLibraryMedia] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tab 3: Scheduled Posts
    const [posts, setPosts] = useState<any[]>([]);
    const [postFilter, setPostFilter] = useState("all");
    const [expandedPost, setExpandedPost] = useState<string | null>(null);

    // Tab 4: Credentials
    const [credentials, setCreds] = useState<any[]>([]);
    const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
    const [credForms, setCredForms] = useState<Record<string, any>>({});
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    // General
    const [message, setMessage] = useState({ text: "", type: "" });

    // Meta Manual Token Modal States
    const [showManualMetaModal, setShowManualMetaModal] = useState(false);
    const [manualPlatform, setManualPlatform] = useState("facebook");
    const [manualMetaToken, setManualMetaToken] = useState("");
    const [connectingManualMeta, setConnectingManualMeta] = useState(false);

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem("token");
            if (!token) { navigate("/auth"); return; }
            try {
                // Fetch tenant dashboard details to load both tenant ID and default user timezone
                const res = await fetch(`${API}/tenant/dashboard`, { headers: getHeaders() });
                const json = await res.json();
                
                if (res.ok && json.success) {
                    const tid = json.data?.tenant?.id || "";
                    setTenantId(tid);
                    if (json.data?.user?.timezone) {
                        setPostTimezone(json.data.user.timezone);
                        localStorage.setItem("user_timezone", json.data.user.timezone);
                    }

                    // Handle OAuth callback parameters in URL search query
                    const params = new URLSearchParams(window.location.search);
                    const code = params.get("code");
                    const error = params.get("error") || params.get("error_message");

                    if (error) {
                        showMsg("OAuth authorization failed: " + error, "error");
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else if (code) {
                        const oauthPlatform = localStorage.getItem("oauth_platform");
                        const oauthRedirectUri = localStorage.getItem("oauth_redirect_uri") || `${window.location.origin}/social`;
                        
                        if (oauthPlatform) {
                            showMsg(`Finalizing connection for ${oauthPlatform}...`, "success");
                            // Clear OAuth parameters from browser URL address bar immediately
                            window.history.replaceState({}, document.title, window.location.pathname);
                            
                            try {
                                const callbackRes = await fetch(`${API}/social/accounts/callback`, {
                                    method: "POST",
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        tenant_id: tid,
                                        platform: oauthPlatform,
                                        code: code,
                                        redirect_uri: oauthRedirectUri,
                                    })
                                });
                                const callbackJson = await callbackRes.json();
                                if (callbackJson.success) {
                                    showMsg(callbackJson.message || "Account connected successfully!");
                                } else {
                                    showMsg(callbackJson.detail || "Failed to connect account", "error");
                                }
                            } catch (callbackErr: any) {
                                showMsg("Failed to exchange OAuth token: " + callbackErr.message, "error");
                            } finally {
                                localStorage.removeItem("oauth_platform");
                                localStorage.removeItem("oauth_redirect_uri");
                            }
                        }
                    }

                    await Promise.all([
                        loadAccounts(tid),
                        loadPosts(tid),
                        loadCredentials(tid),
                    ]);
                } else {
                    throw new Error("Failed to load tenant dashboard details");
                }
            } catch (err: any) {
                showMsg("Failed to load data", "error");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [navigate]);

    const showMsg = (text: string, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    };

    async function loadLibraryMedia(tid: string) {
        if (!tid) return;
        try {
            const res = await fetch(`${API}/social/media/${tid}`, {
                headers: getHeaders(),
            });
            const json = await res.json();
            if (json.success) setLibraryMedia(json.data || []);
        } catch {}
    }

    async function handleUpload(files: FileList | File[]) {
        if (!files || files.length === 0) return;
        setUploading(true);
        const newlyUploaded: any[] = [];
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
                if (json.success && json.data) {
                    newlyUploaded.push(json.data);
                } else {
                    showMsg(json.detail || "Upload failed", "error");
                }
            } catch (err: any) {
                showMsg("Upload failed: " + err.message, "error");
            }
        }
        if (newlyUploaded.length > 0) {
            setAttachedMedia(prev => [...prev, ...newlyUploaded]);
            showMsg("Media uploaded and attached!");
        }
        setUploading(false);
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

    async function loadAccounts(tid: string) {
        if (!tid) return;
        try {
            const res = await fetch(`${API}/social/accounts/${tid}`, { headers: getHeaders() });
            const json = await res.json();
            if (json.success) setAccounts(json.data || []);
        } catch {}
    }

    async function loadPosts(tid: string) {
        if (!tid) return;
        try {
            const res = await fetch(`${API}/social/posts/${tid}`, { headers: getHeaders() });
            const json = await res.json();
            if (json.success) setPosts(json.data || []);
        } catch {}
    }

    async function loadCredentials(tid: string) {
        if (!tid) return;
        try {
            const res = await fetch(`${API}/social/credentials/${tid}`, { headers: getHeaders() });
            const json = await res.json();
            if (json.success) setCreds(json.data || []);
        } catch {}
    }

    // ─── Create Post ───
    async function handleCreatePost(status: "draft" | "scheduled" | "publish_now") {
        if (!caption.trim()) { showMsg("Caption is required", "error"); return; }
        if (selectedAccounts.length === 0) { showMsg("Select at least one account", "error"); return; }

        const payload: any = {
            tenant_id: tenantId,
            caption,
            hashtags,
            mentions,
            link_url: linkUrl,
            media_ids: attachedMedia.map(m => m.id),
            platform_account_ids: selectedAccounts,
            timezone: postTimezone,
            platform_post_ids: customPlatformPostIds,
        };

        if (status === "scheduled" && scheduledAt) {
            payload.scheduled_at = getUtcString(scheduledAt, postTimezone);
        }

        try {
            const res = await fetch(`${API}/social/posts`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.detail || "Failed");

            if (status === "publish_now" && json.data?.id) {
                showMsg("Publishing post immediately...", "success");
                const pubRes = await fetch(`${API}/social/posts/${json.data.id}/publish-now`, {
                    method: "POST",
                    headers: getHeaders(),
                });
                const pubJson = await pubRes.json();
                if (!pubJson.success) {
                    throw new Error(pubJson.message || "Failed to publish post immediately");
                }
                showMsg("Post published successfully!");
            } else {
                showMsg(json.message || "Post created!");
            }

            setCaption(""); setHashtags(""); setMentions(""); setLinkUrl("");
            setSelectedAccounts([]); setScheduledAt(""); setAttachedMedia([]);
            setCustomPlatformPostIds({});
            await loadPosts(tenantId);
            setActiveTab(2);
        } catch (err: any) {
            showMsg(err.message, "error");
        }
    }

    // ─── Delete Post ───
    async function handleDeletePost(postId: string) {
        try {
            await fetch(`${API}/social/posts/${postId}`, { method: "DELETE", headers: getHeaders() });
            showMsg("Post deleted");
            await loadPosts(tenantId);
        } catch { showMsg("Failed to delete", "error"); }
    }

    // ─── Retry Post ───
    async function handleRetryPost(postId: string) {
        try {
            await fetch(`${API}/social/posts/${postId}/retry`, { method: "POST", headers: getHeaders() });
            showMsg("Post queued for retry");
            await loadPosts(tenantId);
        } catch { showMsg("Failed to retry", "error"); }
    }

    // ─── Publish Post Now ───
    async function handlePublishNow(postId: string) {
        try {
            showMsg("Publishing post immediately...", "success");
            const res = await fetch(`${API}/social/posts/${postId}/publish-now`, {
                method: "POST",
                headers: getHeaders(),
            });
            const json = await res.json();
            if (json.success) {
                showMsg(json.message || "Post published successfully!");
            } else {
                showMsg(json.message || "Publishing failed: " + (json.message || "Unknown error"), "error");
            }
            await loadPosts(tenantId);
        } catch (err: any) {
            showMsg("Failed to publish: " + err.message, "error");
        }
    }

    // ─── Save Credentials ───
    async function handleSaveCred(platform: string) {
        const existing = credentials.find(c => c.platform === platform) || {};
        const form = credForms[platform] || {};
        
        const payload = {
            tenant_id: tenantId,
            platform,
            app_id: form.app_id ?? existing.app_id ?? "",
            client_id: form.client_id ?? "",
            client_secret: form.client_secret ?? "",
            redirect_uri: form.redirect_uri ?? existing.redirect_uri ?? "",
            webhook_url: form.webhook_url ?? existing.webhook_url ?? "",
            additional_config: {
                ...(existing.additional_config || {}),
                ...(form.additional_config || {})
            }
        };

        try {
            const res = await fetch(`${API}/social/credentials`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            showMsg(json.message || "Saved");
            setCredForms(prev => ({ ...prev, [platform]: {} }));
            await loadCredentials(tenantId);
        } catch { showMsg("Failed to save credentials", "error"); }
    }

    // ─── Disconnect Account ───
    async function handleDisconnect(accountId: string) {
        try {
            await fetch(`${API}/social/accounts/${accountId}`, { method: "DELETE", headers: getHeaders() });
            showMsg("Account disconnected");
            await loadAccounts(tenantId);
        } catch { showMsg("Failed to disconnect", "error"); }
    }

    // ─── Connect Account (OAuth Redirect) ───
    async function handleConnect(platform: string) {
        try {
            const existing = credentials.find(c => c.platform === platform);
            const redirectUri = existing?.redirect_uri || `${window.location.origin}/social`;
            const url = `${API}/social/accounts/auth-url?tenant_id=${tenantId}&platform=${platform}&redirect_uri=${encodeURIComponent(redirectUri)}`;
            
            const res = await fetch(url, { headers: getHeaders() });
            const json = await res.json();
            if (json.success && json.auth_url) {
                localStorage.setItem("oauth_platform", platform);
                localStorage.setItem("oauth_redirect_uri", redirectUri);
                window.location.href = json.auth_url;
            } else {
                showMsg(json.detail || "Failed to generate authorization URL", "error");
            }
        } catch (err: any) {
            showMsg("Connection failed: " + err.message, "error");
        }
    }

    // ─── Connect Meta Manually via Access Token ───
    async function handleConnectManualMeta() {
        if (!manualMetaToken.trim()) return;
        setConnectingManualMeta(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API}/social/accounts/connect-token`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    platform: manualPlatform,
                    token: manualMetaToken.trim(),
                })
            });
            const json = await res.json();
            if (json.success) {
                showMsg(json.message || "Manual account(s) connected successfully!");
                setShowManualMetaModal(false);
                setManualMetaToken("");
                await loadAccounts(tenantId);
            } else {
                showMsg(json.detail || json.message || "Failed to connect manual account", "error");
            }
        } catch (err: any) {
            showMsg("Connection failed: " + err.message, "error");
        } finally {
            setConnectingManualMeta(false);
        }
    }

    // ─── AI Caption ───
    async function handleAICaption() {
        if (!caption.trim()) { showMsg("Write some context first", "error"); return; }
        try {
            const res = await fetch(`${API}/social/ai/caption`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ context: caption, platform: "general", tone: "professional" }),
            });
            const json = await res.json();
            if (json.success && json.data?.caption) {
                setCaption(json.data.caption);
                showMsg("AI caption generated!");
            }
        } catch { showMsg("AI generation failed", "error"); }
    }

    // ─── AI Hashtags ───
    async function handleAIHashtags() {
        if (!caption.trim()) return;
        try {
            const res = await fetch(`${API}/social/ai/hashtags`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ caption, platform: "general" }),
            });
            const json = await res.json();
            if (json.success && json.data?.hashtags) {
                setHashtags(json.data.hashtags.join(" "));
                showMsg("Hashtags suggested!");
            }
        } catch {}
    }

    const filteredPosts = postFilter === "all" ? posts : posts.filter(p => p.status === postFilter);

    const tabs = ["Connected Accounts", "Create Post", "Scheduled Posts", "Settings"];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden flex flex-col">
            <NavigationBar />
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                            <Share2 size={24} className="text-primary-600" />
                        </span>
                        Social Hub
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Manage accounts, create posts, and track performance across all platforms
                    </p>
                </header>

                {/* Notification */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-2xl font-bold text-sm ${
                        message.type === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-8 bg-slate-50 bg-white border border-slate-200 shadow-sm rounded-xl p-2 rounded-[20px] overflow-x-auto">
                    {tabs.map((tab, i) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(i)}
                            className={`px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md whitespace-nowrap ${activeTab === i ? "active" : ""}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ═══ TAB 0: CONNECTED ACCOUNTS ═══ */}
                {activeTab === 0 && (
                    <div className="space-y-10">
                        {/* Active Connections */}
                        <div>
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="w-2.5 h-6 rounded-full bg-primary-600"></span>
                                Active Connections
                            </h2>
                            {accounts.length === 0 ? (
                                <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-10 text-center">
                                    <div className="flex justify-center gap-4 mb-4 opacity-50">
                                        {PLATFORMS.map(p => (
                                            <span key={p.key} className="text-2xl">{p.icon}</span>
                                        ))}
                                    </div>
                                    <p className="text-slate-500 text-sm">No connected social media accounts yet.</p>
                                    <p className="text-[#9CA3AF] text-xs mt-1">Connect your accounts using the panel below or configure settings first.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {accounts.map((acc) => {
                                        const plat = PLATFORMS.find(p => p.key === acc.platform);
                                        const statusColor = acc.status === "active" ? "green" : acc.status === "expiring_soon" ? "amber" : "red";
                                        return (
                                            <div key={acc.id} className="bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow rounded-[28px] p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl" style={{ color: plat?.color }}>{plat?.icon || "🔗"}</span>
                                                        <div>
                                                            <div className="font-bold text-sm truncate max-w-[140px]">{acc.account_name || acc.platform_name}</div>
                                                            <div className="text-xs text-slate-500 truncate max-w-[140px]">@{acc.account_handle || "—"}</div>
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium-${statusColor} capitalize text-[10px]`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full bg-current ${acc.status === "active" ? "animate-pulse" : ""}`}></span>
                                                        {acc.status}
                                                    </span>
                                                </div>

                                                <div className="text-[10px] text-[#9CA3AF] mb-4">
                                                    Last synced: {acc.last_synced_at ? formatInUserTimezone(acc.last_synced_at) : "Never"}
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleDisconnect(acc.id)}
                                                        className="flex-1 px-4 py-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold text-danger hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={13} className="inline mr-1" />Disconnect
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Connection Center */}
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-6 md:p-8">
                            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                                <Zap size={18} className="text-primary-600" />
                                Connection Center
                            </h2>
                            <p className="text-xs text-slate-500 mb-6">
                                Link your social media profiles using your configured platform API credentials.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {PLATFORMS.map(plat => {
                                    const hasCred = credentials.some(c => c.platform === plat.key);
                                    const isConnected = accounts.some(a => a.platform === plat.key);

                                    return (
                                        <div key={plat.key} className="bg-slate-50 border border-slate-200 rounded-xl rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl" style={{ color: plat.color }}>{plat.icon}</span>
                                                    <div>
                                                        <h4 className="font-bold text-sm">{plat.name}</h4>
                                                        <span className="text-[10px] text-[#9CA3AF]">
                                                            {hasCred ? "API Credentials Ready" : "Credentials Missing"}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isConnected && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success text-[9px] px-2 py-0.5 font-bold">
                                                        CONNECTED
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-4 flex flex-col gap-2">
                                                {hasCred ? (
                                                    <button
                                                        onClick={() => handleConnect(plat.key)}
                                                        className="w-full py-2 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                                                    >
                                                        <Zap size={12} /> {isConnected ? "Connect Another" : "Connect Account"}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setActiveTab(3)} // Switch to Settings/Credentials tab
                                                        className="w-full py-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors"
                                                    >
                                                        Configure in Settings
                                                    </button>
                                                )}
                                                {(plat.key === "facebook" || plat.key === "instagram") && (
                                                    <button
                                                        onClick={() => {
                                                            setManualPlatform(plat.key);
                                                            setShowManualMetaModal(true);
                                                        }}
                                                        className="w-full py-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold text-primary-600 hover:text-[#5B52EE] flex items-center justify-center gap-1.5 transition-colors"
                                                    >
                                                        <Shield size={12} /> Connect via Access Token
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ TAB 1: CREATE POST ═══ */}
                {activeTab === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Caption */}
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="font-bold text-sm">Caption</label>
                                    <div className="flex gap-2">
                                        <button onClick={handleAICaption} className="px-3 py-1.5 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                            <Zap size={12} className="text-primary-600" /> AI Enhance
                                        </button>
                                        <span className="text-xs text-[#9CA3AF] self-center">{caption.length} chars</span>
                                    </div>
                                </div>
                                <textarea
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    placeholder="Write your post caption..."
                                    className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] w-full"
                                    rows={5}
                                />
                            </div>

                            {/* Media upload and select area */}
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="font-bold text-sm">Media Content (Photo/Video)</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLibraryModal(true);
                                            loadLibraryMedia(tenantId);
                                        }}
                                        className="px-3 py-1.5 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold flex items-center gap-1.5"
                                    >
                                        Choose from Library
                                    </button>
                                </div>

                                {/* Drag & Drop Area */}
                                <div
                                    className={`border-2 border-dashed border-slate-300 hover:border-primary-500 bg-slate-50 transition-colors mb-4 relative ${dragActive ? "active" : ""}`}
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
                                        <div className="flex items-center justify-center gap-3 py-4">
                                            <div className="animate-spin h-6 w-6 border-3 border-primary-600 border-t-transparent rounded-full"></div>
                                            <span className="font-bold text-primary-600">Uploading...</span>
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center">
                                            <Upload size={28} className="mx-auto text-primary-600 mb-2" />
                                            <p className="font-bold text-xs mb-1">
                                                {dragActive ? "Drop files here" : "Drag & drop files here"}
                                            </p>
                                            <p className="text-[10px] text-[#9CA3AF]">
                                                or click to browse • Images or Videos • Max 100MB
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Attached Previews */}
                                {attachedMedia.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {attachedMedia.map(item => {
                                            const isImg = item.mime_type?.startsWith("image/") || item.has_thumbnail;
                                            return (
                                                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-200 rounded-xl bg-slate-50 group border border-white/40">
                                                    {isImg ? (
                                                        <img
                                                            src={`${API}/social/media/thumbnail/${item.id}`}
                                                            alt={item.original_filename}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="text-[10px] font-bold text-primary-600 uppercase bg-purple-100 px-2 py-1 rounded">VIDEO</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAttachedMedia(prev => prev.filter(m => m.id !== item.id));
                                                        }}
                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md z-10"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                    <div className="absolute bottom-0 inset-x-0 bg-black/40 px-2 py-1 text-[9px] text-white truncate">
                                                        {item.original_filename || item.filename}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Hashtags & Mentions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="font-bold text-sm">Hashtags</label>
                                        <button onClick={handleAIHashtags} className="px-3 py-1.5 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                            <Zap size={12} className="text-primary-600" /> Suggest
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={hashtags}
                                        onChange={e => setHashtags(e.target.value)}
                                        placeholder="#marketing #digital"
                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6">
                                    <label className="font-bold text-sm mb-3 block">Mentions</label>
                                    <input
                                        type="text"
                                        value={mentions}
                                        onChange={e => setMentions(e.target.value)}
                                        placeholder="@company @partner"
                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* Link */}
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6">
                                <label className="font-bold text-sm mb-3 block">Link URL</label>
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={e => setLinkUrl(e.target.value)}
                                    placeholder="https://yoursite.com/page"
                                    className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            {/* Schedule */}
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6">
                                <label className="font-bold text-sm mb-3 block">Schedule</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={e => setScheduledAt(e.target.value)}
                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <select
                                        value={postTimezone}
                                        onChange={e => setPostTimezone(e.target.value)}
                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">Eastern</option>
                                        <option value="America/Los_Angeles">Pacific</option>
                                        <option value="Europe/London">London</option>
                                        <option value="Asia/Kolkata">India</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Right Side — Account Selector & Actions */}
                        <div className="space-y-6">
                            {/* Platform Selector */}
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6">
                                <label className="font-bold text-sm mb-4 block">Publish To</label>
                                {accounts.length === 0 ? (
                                    <p className="text-sm text-[#9CA3AF]">No connected accounts. Connect accounts first.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {accounts.map(acc => {
                                            const plat = PLATFORMS.find(p => p.key === acc.platform);
                                            const isSelected = selectedAccounts.includes(acc.id);
                                            return (
                                                <label
                                                    key={acc.id}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                                                        isSelected ? "bg-slate-50 border border-slate-200 rounded-xl" : "bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-white border border-slate-200 shadow-sm rounded-xl"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            setSelectedAccounts(prev =>
                                                                isSelected
                                                                    ? prev.filter(id => id !== acc.id)
                                                                    : [...prev, acc.id]
                                                            );
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="text-lg">{plat?.icon || "🔗"}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm truncate">{acc.account_name || plat?.name}</div>
                                                        <div className="text-xs text-[#9CA3AF] truncate">@{acc.account_handle}</div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Link Existing Post IDs Input Section */}
                            {selectedAccounts.length > 0 && (
                                <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[28px] p-6">
                                    <label className="font-bold text-sm mb-2 block flex items-center gap-2">
                                        <Shield size={16} className="text-primary-600" />
                                        Link Existing Post IDs
                                    </label>
                                    <p className="text-[10px] text-[#9CA3AF] mb-4 leading-relaxed">
                                        If this post already exists on the selected platform(s), enter the post ID here. FastoClick will fetch analytics directly and skip publishing.
                                    </p>
                                    <div className="space-y-4">
                                        {Array.from(new Set(
                                            selectedAccounts.map(id => accounts.find(a => a.id === id)?.platform).filter(Boolean)
                                        )).map(platKey => {
                                            const plat = PLATFORMS.find(p => p.key === platKey);
                                            return (
                                                <div key={platKey} className="space-y-2">
                                                    <div className="flex items-center gap-2 text-xs font-bold">
                                                        <span style={{ color: plat?.color }}>{plat?.icon}</span>
                                                        <span>{plat?.name} Post ID</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={customPlatformPostIds[platKey || ""] || ""}
                                                        onChange={e => setCustomPlatformPostIds(prev => ({
                                                            ...prev,
                                                            [platKey || ""]: e.target.value
                                                        }))}
                                                        placeholder={`e.g. ${(platKey === "facebook" || platKey === "meta") ? "123456_7890" : "18029348123"}`}
                                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 text-xs"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleCreatePost("draft")}
                                    className="w-full px-6 py-3.5 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl font-bold text-sm"
                                >
                                    Save Draft
                                </button>
                                <button
                                    onClick={() => handleCreatePost("scheduled")}
                                    className="w-full px-6 py-3.5 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                                    disabled={!scheduledAt}
                                >
                                    <Clock size={16} /> Schedule Post
                                </button>
                                <button
                                    onClick={() => handleCreatePost("publish_now")}
                                    className="w-full px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                                    style={{
                                        background: "linear-gradient(135deg, #6C63FF, #8B84FF)",
                                        color: "white",
                                        boxShadow: "6px 6px 12px rgba(108,99,255,0.3), -6px -6px 12px rgba(255,255,255,0.5)",
                                    }}
                                >
                                    <Send size={16} /> Publish Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ TAB 2: SCHEDULED POSTS ═══ */}
                {activeTab === 2 && (
                    <div>
                        {/* Filters */}
                        <div className="flex gap-2 mb-6 flex-wrap">
                            {["all", "draft", "scheduled", "publishing", "published", "failed"].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setPostFilter(f)}
                                    className={`px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md text-xs ${postFilter === f ? "active" : ""}`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>

                        {filteredPosts.length === 0 ? (
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[32px] p-12 text-center">
                                <Clock size={48} className="mx-auto text-[#9CA3AF] mb-4" />
                                <h3 className="text-xl font-bold mb-2">No Posts Found</h3>
                                <p className="text-slate-500">Create your first post to see it here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredPosts.map(post => {
                                    const badge = STATUS_BADGES[post.status] || STATUS_BADGES.draft;
                                    const isExpanded = expandedPost === post.id;
                                    return (
                                        <div key={post.id} className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[24px] p-6 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <p className="font-bold text-sm mb-2 line-clamp-2">{post.caption || "Untitled post"}</p>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className={badge.class}>{badge.label}</span>
                                                        {post.platforms?.map((p: any, i: number) => (
                                                            <span key={i} className="text-xs text-slate-500">
                                                                {PLATFORMS.find(pp => pp.key === p.platform)?.icon} {p.platform_name}
                                                            </span>
                                                        ))}
                                                        {post.scheduled_at && (
                                                            <span className="text-xs text-[#9CA3AF]">
                                                                <Clock size={12} className="inline mr-1" />
                                                                {formatInUserTimezone(post.scheduled_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {(post.status === "draft" || post.status === "scheduled") && (
                                                        <button onClick={() => handlePublishNow(post.id)} className="p-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl" title="Publish Now">
                                                            <Send size={16} className="text-primary-600" />
                                                        </button>
                                                    )}
                                                    {post.status === "failed" && (
                                                        <button onClick={() => handleRetryPost(post.id)} className="p-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl" title="Retry">
                                                            <RefreshCw size={16} className="text-[#D97706]" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeletePost(post.id)} className="p-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl" title="Delete">
                                                        <Trash2 size={16} className="text-red-400" />
                                                    </button>
                                                    <button onClick={() => setExpandedPost(isExpanded ? null : post.id)} className="p-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl">
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-white/30">
                                                    {post.hashtags && (
                                                        <p className="text-xs text-primary-600 mb-2">{post.hashtags}</p>
                                                    )}
                                                    {post.media_ids && post.media_ids.length > 0 && (
                                                        <div className="mb-3 flex flex-wrap gap-2">
                                                            {post.media_ids.map((mediaId: string) => (
                                                                <div key={mediaId} className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 rounded-xl bg-slate-50 border border-white/40">
                                                                    <img
                                                                        src={`${API}/social/media/thumbnail/${mediaId}`}
                                                                        alt="Post media"
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = "";
                                                                            (e.target as HTMLImageElement).style.display = "none";
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {post.platform_post_ids && Object.keys(post.platform_post_ids).length > 0 && (
                                                        <div className="mb-4">
                                                            <div className="font-bold text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                                                                <Shield size={12} className="text-primary-600" />
                                                                Linked Platform Post IDs
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Object.entries(post.platform_post_ids).map(([platform, postId]) => {
                                                                    const plat = PLATFORMS.find(p => p.key === platform);
                                                                    return (
                                                                        <div
                                                                            key={platform}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-[#4B5563]"
                                                                            title="Click to copy Post ID"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigator.clipboard.writeText(postId as string);
                                                                                showMsg(`Copied ${plat?.name || platform} Post ID!`);
                                                                            }}
                                                                            style={{ cursor: "pointer" }}
                                                                        >
                                                                            <span style={{ color: plat?.color }}>{plat?.icon || "🔗"}</span>
                                                                            <span className="font-bold uppercase text-[10px] text-slate-500">{plat?.name || platform}:</span>
                                                                            <span className="select-all font-semibold">{postId as string}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {post.publish_log?.length > 0 && (
                                                        <div className="mt-3">
                                                            <div className="font-bold text-xs text-slate-500 mb-2">Publish Log</div>
                                                            <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                                                                {post.publish_log.map((log: any, i: number) => (
                                                                    <div key={i} className="text-xs flex items-start gap-2">
                                                                        {log.success ? (
                                                                            <Check size={12} className="text-success mt-0.5" />
                                                                        ) : (
                                                                            <X size={12} className="text-danger mt-0.5" />
                                                                        )}
                                                                        <div>
                                                                            <span className="font-bold">{log.platform || "—"}</span>
                                                                            {log.error && <span className="text-danger ml-2">{log.error}</span>}
                                                                            <span className="text-[#9CA3AF] ml-2">{log.timestamp ? formatInUserTimezone(log.timestamp, "time") : ""}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ TAB 3: SETTINGS (CREDENTIALS) ═══ */}
                {activeTab === 3 && (
                    <div>
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[24px] p-4 mb-6 flex items-start gap-3">
                            <Shield size={20} className="text-[#D97706] mt-0.5" />
                            <div className="text-sm">
                                <strong className="text-[#D97706]">Security Notice:</strong>{" "}
                                <span className="text-slate-500">
                                    API credentials are encrypted at rest. Never share your client secrets. Register your apps on each platform's developer portal first.
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {PLATFORMS.map(plat => {
                                const isExpanded = expandedPlatform === plat.key;
                                const existing = credentials.find(c => c.platform === plat.key);
                                const form = credForms[plat.key] || {};

                                return (
                                    <div key={plat.key} className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[24px] overflow-hidden">
                                        <button
                                            onClick={() => setExpandedPlatform(isExpanded ? null : plat.key)}
                                            className="w-full flex items-center justify-between p-5 text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{plat.icon}</span>
                                                <div>
                                                    <div className="font-bold">{plat.name}</div>
                                                    <div className="text-xs text-[#9CA3AF]">
                                                        {existing ? (
                                                            <span className="flex items-center gap-1">
                                                                {existing.is_validated ? (
                                                                    <><Check size={12} className="text-success" /> Validated</>
                                                                ) : (
                                                                    <><AlertCircle size={12} className="text-amber-500" /> Not validated</>
                                                                )}
                                                            </span>
                                                        ) : "No credentials configured"}
                                                    </div>
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>

                                        {isExpanded && (
                                            <div className="px-5 pb-5 space-y-4 border-t border-white/20 pt-4">
                                                <div>
                                                    <label className="font-bold text-xs text-slate-500 mb-2 block">App ID</label>
                                                    <input
                                                        type="text"
                                                        value={form.app_id ?? existing?.app_id ?? ""}
                                                        onChange={e => setCredForms(prev => ({ ...prev, [plat.key]: { ...prev[plat.key], app_id: e.target.value } }))}
                                                        placeholder="Your app ID"
                                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="font-bold text-xs text-slate-500 mb-2 block">Client ID</label>
                                                    <input
                                                        type="text"
                                                        value={form.client_id ?? ""}
                                                        onChange={e => setCredForms(prev => ({ ...prev, [plat.key]: { ...prev[plat.key], client_id: e.target.value } }))}
                                                        placeholder={existing?.client_id || "Enter client ID"}
                                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="font-bold text-xs text-slate-500 mb-2 block">Client Secret</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showSecrets[plat.key] ? "text" : "password"}
                                                            value={form.client_secret ?? ""}
                                                            onChange={e => setCredForms(prev => ({ ...prev, [plat.key]: { ...prev[plat.key], client_secret: e.target.value } }))}
                                                            placeholder={existing?.client_secret ? "••••••••" : "Enter client secret"}
                                                            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 pr-12"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowSecrets(prev => ({ ...prev, [plat.key]: !prev[plat.key] }))}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-slate-900"
                                                        >
                                                            {showSecrets[plat.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="font-bold text-xs text-slate-500 mb-2 block">Redirect URI</label>
                                                    <input
                                                        type="url"
                                                        value={form.redirect_uri ?? existing?.redirect_uri ?? ""}
                                                        onChange={e => setCredForms(prev => ({ ...prev, [plat.key]: { ...prev[plat.key], redirect_uri: e.target.value } }))}
                                                        placeholder="https://yourapp.com/callback"
                                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="font-bold text-xs text-slate-500 mb-2 block flex items-center justify-between">
                                                        <span>Scopes (Optional)</span>
                                                        <span className="text-[10px] text-[#9CA3AF] font-normal">Comma-separated</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={form.additional_config?.scopes ?? existing?.additional_config?.scopes ?? ""}
                                                        onChange={e => setCredForms(prev => ({
                                                            ...prev,
                                                            [plat.key]: {
                                                                ...prev[plat.key],
                                                                additional_config: {
                                                                    ...(prev[plat.key]?.additional_config || {}),
                                                                    scopes: e.target.value
                                                                }
                                                            }
                                                        }))}
                                                        placeholder="Custom OAuth scopes"
                                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                </div>

                                                {(plat.key === "facebook" || plat.key === "instagram" || plat.key === "meta") && (
                                                    <div>
                                                        <label className="font-bold text-xs text-slate-500 mb-2 block flex items-center justify-between">
                                                            <span>Configuration ID</span>
                                                            <span className="text-[10px] text-[#10B981] font-semibold">config_id from Meta Portal</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={form.additional_config?.config_id ?? existing?.additional_config?.config_id ?? ""}
                                                            onChange={e => setCredForms(prev => ({
                                                                ...prev,
                                                                [plat.key]: {
                                                                    ...prev[plat.key],
                                                                    additional_config: {
                                                                        ...(prev[plat.key]?.additional_config || {}),
                                                                        config_id: e.target.value
                                                                    }
                                                                }
                                                            }))}
                                                            placeholder="e.g. 1234567890123"
                                                            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        onClick={() => handleSaveCred(plat.key)}
                                                        className="px-5 py-2.5 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-sm font-bold"
                                                    >
                                                        Save Credentials
                                                    </button>
                                                    {existing && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const r = await fetch(`${API}/social/credentials/validate`, {
                                                                        method: "POST",
                                                                        headers: getHeaders(),
                                                                        body: JSON.stringify({ tenant_id: tenantId, platform: plat.key }),
                                                                    });
                                                                    const j = await r.json();
                                                                    showMsg(j.message || (j.success ? "Valid!" : "Invalid"), j.success ? "success" : "error");
                                                                    await loadCredentials(tenantId);
                                                                } catch { showMsg("Validation failed", "error"); }
                                                            }}
                                                            className="px-5 py-2.5 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-sm font-bold"
                                                        >
                                                            Validate
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal to choose from Media Library */}
            {showLibraryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-50 rounded-[32px] w-full max-w-3xl max-h-[85vh] flex flex-col p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                    <Upload size={16} className="text-primary-600" />
                                </span>
                                Choose from Media Library
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowLibraryModal(false)}
                                className="p-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-slate-900"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body / Media List */}
                        <div className="flex-1 overflow-y-auto mb-6 pr-2">
                            {libraryMedia.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl rounded-2xl">
                                    <p className="text-sm text-[#9CA3AF]">No media files in library yet.</p>
                                    <p className="text-xs text-[#9CA3AF] mt-1">Upload files to library to see them here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {libraryMedia.map(item => {
                                        const isImg = item.mime_type?.startsWith("image/") || item.has_thumbnail;
                                        const isAlreadyAttached = attachedMedia.some(m => m.id === item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    if (isAlreadyAttached) {
                                                        setAttachedMedia(prev => prev.filter(m => m.id !== item.id));
                                                    } else {
                                                        setAttachedMedia(prev => [...prev, item]);
                                                    }
                                                }}
                                                className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all border-2 ${
                                                    isAlreadyAttached ? "border-primary-600 scale-95 shadow-inner" : "border-transparent bg-white border border-slate-200 shadow-sm rounded-xl hover:scale-105"
                                                }`}
                                            >
                                                {isImg ? (
                                                    <img
                                                        src={`${API}/social/media/thumbnail/${item.id}`}
                                                        alt={item.original_filename}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-[#d3d8df]">
                                                        <span className="text-[10px] font-bold text-primary-600 bg-purple-100 px-2 py-1 rounded">VIDEO</span>
                                                    </div>
                                                )}

                                                {/* Selection badge */}
                                                {isAlreadyAttached && (
                                                    <div className="absolute top-2 right-2 bg-primary-600 text-white p-1 rounded-full shadow-md z-10">
                                                        <Check size={12} />
                                                    </div>
                                                )}

                                                <div className="absolute bottom-0 inset-x-0 bg-black/40 px-2 py-1 text-[10px] text-white truncate">
                                                    {item.original_filename || item.filename}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setShowLibraryModal(false)}
                                className="px-6 py-2.5 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-sm font-bold"
                            >
                                Done Selecting ({attachedMedia.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Meta Manual Token */}
            {showManualMetaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-50 rounded-[32px] w-full max-w-lg flex flex-col p-6 md:p-8 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative">
                         {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                                    <Shield size={16} className="text-primary-600" />
                                </span>
                                Connect {manualPlatform === "instagram" ? "Instagram" : "Facebook"} manually
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowManualMetaModal(false)}
                                className="p-2 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-slate-900"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Paste your Meta User or Page Access Token from Graph API Explorer or your app credentials. FastoClick will fetch the associated {manualPlatform === "instagram" ? "Instagram account" : "Facebook page"} and connect it.
                            </p>
                            <div>
                                <label className="font-bold text-xs text-slate-500 mb-2 block flex items-center justify-between">
                                    <span>Access Token</span>
                                    <span className="text-[10px] text-[#9CA3AF] font-normal">User or Page token</span>
                                </label>
                                <textarea
                                    rows={4}
                                    value={manualMetaToken}
                                    onChange={e => setManualMetaToken(e.target.value)}
                                    placeholder="EAABw..."
                                    className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs p-3 w-full"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 pt-6">
                            <button
                                type="button"
                                onClick={() => setShowManualMetaModal(false)}
                                className="px-5 py-2.5 inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-sm font-bold text-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={connectingManualMeta || !manualMetaToken.trim()}
                                onClick={handleConnectManualMeta}
                                className="px-5 py-2.5 inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-xl text-sm font-bold disabled:opacity-50"
                            >
                                {connectingManualMeta ? "Connecting..." : (manualPlatform === "instagram" ? "Connect Accounts" : "Connect Pages")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
