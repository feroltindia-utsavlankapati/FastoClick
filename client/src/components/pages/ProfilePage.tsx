import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import NavigationBar from "../UI/NavigationBar";
import { User, Mail, Globe, Camera, Save, ArrowLeft, Check, AlertCircle, Sparkles } from "lucide-react";

interface UserProfile {
    id: string;
    username: string;
    email: string;
    profile_image_url: string | null;
    timezone: string;
}

export default function ProfilePage() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [timezone, setTimezone] = useState("UTC");
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/auth");
                return;
            }

            try {
                const response = await fetch("http://localhost:8000/tenant/dashboard", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                
                const json = await response.json();
                
                if (!response.ok || !json.success) {
                    throw new Error(json.error?.message || "Failed to load profile details");
                }
                
                const userData = json.data.user;
                setUser(userData);
                setTimezone(userData.timezone || "UTC");
                if (userData.timezone) {
                    localStorage.setItem("user_timezone", userData.timezone);
                }
                if (userData.profile_image_url) {
                    setImagePreview(userData.profile_image_url);
                }
            } catch (err: any) {
                setErrorMsg(err.message);
                if (err.message.includes("token")) {
                    localStorage.removeItem("token");
                    navigate("/auth");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setErrorMsg("Please upload a valid image file (PNG, JPG, GIF, or WEBP).");
            return;
        }

        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg("Profile picture must be smaller than 5MB.");
            return;
        }

        setErrorMsg("");
        setProfileImageFile(file);
        
        // Show local preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/auth");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("timezone", timezone);
            if (profileImageFile) {
                formData.append("profile_image", profileImageFile);
            }

            const response = await fetch("http://localhost:8000/tenant/profile", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const json = await response.json();

            if (!response.ok || !json.success) {
                throw new Error(json.error?.message || "Failed to update profile settings");
            }

            const updatedUser = json.data.user;
            setUser(updatedUser);
            setTimezone(updatedUser.timezone);
            if (updatedUser.timezone) {
                localStorage.setItem("user_timezone", updatedUser.timezone);
            }
            if (updatedUser.profile_image_url) {
                setImagePreview(updatedUser.profile_image_url);
            }
            
            setSuccessMsg("Profile settings updated successfully!");
            
            // Clear message after 4s
            setTimeout(() => {
                setSuccessMsg("");
            }, 4000);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    const getUserInitials = () => {
        if (!user) return "?";
        return user.username.slice(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative pb-12">
            <NavigationBar />

            {/* Background design accents */}
            <div className="absolute top-20 left-10 w-80 h-80 rounded-full bg-slate-50 border border-slate-200 rounded-xl pointer-events-none opacity-20 flex items-center justify-center">
                <div className="w-56 h-56 rounded-full bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-slate-50 border border-slate-200 rounded-xl"></div>
                </div>
            </div>

            <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-10 relative z-10">
                {/* Back button & Header */}
                <div className="flex flex-col gap-4 mb-8">
                    <Link 
                        to="/dashboard" 
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary-600 transition-all inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 w-fit px-4 py-2.5 rounded-xl"
                    >
                        <ArrowLeft size={14} />
                        Back to Dashboard
                    </Link>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                            Profile Settings
                            <Sparkles size={20} className="text-primary-600" />
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">Configure your default timezone and professional profile details</p>
                    </div>
                </div>

                {/* Main Settings Card */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-[36px] p-8 md:p-12">
                    <form onSubmit={handleSave} className="space-y-8">
                        
                        {/* Status Banners */}
                        {successMsg && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-emerald-100 animate-in fade-in duration-300">
                                <Check size={18} className="shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}
                        {errorMsg && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl bg-red-50 text-danger p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-100 animate-in fade-in duration-300">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Profile Image Row */}
                        <div className="flex flex-col items-center justify-center gap-4 py-4">
                            <div 
                                onClick={triggerFileInput}
                                className="group relative w-36 h-36 rounded-full bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center cursor-pointer overflow-hidden border-4 border-white/20 transition-all duration-300 hover:scale-[1.02]"
                                title="Click to upload profile photo"
                            >
                                {imagePreview ? (
                                    <img 
                                        src={imagePreview} 
                                        alt="Profile Preview" 
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-50 flex items-center justify-center font-black text-3xl text-primary-600 tracking-widest bg-slate-50 border border-slate-200 rounded-xl rounded-full">
                                        {getUserInitials()}
                                    </div>
                                )}
                                
                                {/* Overlay hover state */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white gap-1 rounded-full">
                                    <Camera size={20} className="animate-bounce" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Change Photo</span>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <div className="text-center">
                                <span className="text-[10px] text-[#8B95A5] font-semibold">Accepted formats: PNG, JPG, GIF, WEBP (Max 5MB)</span>
                            </div>
                        </div>

                        {/* Grid Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Username (Disabled) */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1">Username</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B95A5]">
                                        <User size={16} />
                                    </span>
                                    <input 
                                        type="text" 
                                        value={user?.username || ""} 
                                        disabled
                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 pl-12 bg-white/20 text-[#8B95A5] cursor-not-allowed select-none"
                                    />
                                </div>
                            </div>

                            {/* Email Address (Disabled) */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1">Email Address</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B95A5]">
                                        <Mail size={16} />
                                    </span>
                                    <input 
                                        type="email" 
                                        value={user?.email || ""} 
                                        disabled
                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 pl-12 bg-white/20 text-[#8B95A5] cursor-not-allowed select-none"
                                    />
                                </div>
                            </div>
                            
                            {/* Timezone (Selectable) */}
                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1">Default Post Timezone</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-600">
                                        <Globe size={16} className="animate-spin duration-1000" style={{ animationDuration: "12s" }} />
                                    </span>
                                    <select 
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 pl-12 pr-10 cursor-pointer focus:border-primary-600"
                                    >
                                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                                        <option value="America/New_York">Eastern Time (New York, Miami, Toronto)</option>
                                        <option value="America/Chicago">Central Time (Chicago, Dallas, Winnipeg)</option>
                                        <option value="America/Denver">Mountain Time (Denver, Calgary, Phoenix)</option>
                                        <option value="America/Los_Angeles">Pacific Time (Los Angeles, Seattle, Vancouver)</option>
                                        <option value="Europe/London">London (GMT/BST, UK)</option>
                                        <option value="Europe/Paris">Central European Time (Paris, Berlin, Rome)</option>
                                        <option value="Asia/Kolkata">India Standard Time (Mumbai, New Delhi, Kolkata)</option>
                                        <option value="Asia/Singapore">Singapore Time (Singapore, Kuala Lumpur)</option>
                                        <option value="Asia/Tokyo">Japan Standard Time (Tokyo, Seoul)</option>
                                        <option value="Australia/Sydney">Sydney Time (Sydney, Melbourne, Canberra)</option>
                                    </select>
                                </div>
                                <span className="text-[10px] text-[#8B95A5] font-semibold mt-1 ml-1">
                                    * Scheduled posts will automatically default to this timezone so you don't have to specify it for every post.
                                </span>
                            </div>

                        </div>

                        {/* Save Action Button */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500
                                    ${saving 
                                        ? "bg-slate-50 border border-slate-200 rounded-xl text-primary-600 cursor-not-allowed scale-[0.98]" 
                                        : "inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-slate-50 border border-slate-200 rounded-xl active:scale-[0.99] text-white hover:text-primary-600"
                                    }
                                `}
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full mr-1"></div>
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Save Profile Settings
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
}
