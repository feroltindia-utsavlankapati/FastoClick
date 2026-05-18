import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, Eye, EyeOff, User, Mail, Lock,
  Building2, ArrowRight, Loader2,
  AlertCircle, CheckCircle2, BarChart3, Brain, Target
} from "lucide-react";

const FEATURES = [
  { icon: BarChart3, label: "AI-Driven Analytics" },
  { icon: Brain,     label: "Agentic Workflows" },
  { icon: Target,    label: "Strategy Planning" },
];

// ─── Neumorphic Input ─────────────────────────────────────────────────────────
function NeoInput({
  id, label, type = "text", value, onChange,
  placeholder, icon: Icon, required = false, rightEl,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  icon: React.ElementType; required?: boolean;
  rightEl?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0] pointer-events-none">
          <Icon size={16} />
        </span>
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="
            w-full soft-inset-deep bg-transparent rounded-2xl
            pl-11 pr-12 py-3.5 text-sm text-[#3D4852]
            placeholder-[#A0AEC0] font-medium
            focus:outline-none focus:ring-2 focus:ring-[#6C63FF]
            focus:ring-offset-2 focus:ring-offset-[#E0E5EC]
            transition-all duration-200
          "
        />
        {rightEl && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">{rightEl}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuthPage() {
  const [isLogin,    setIsLogin]    = useState(true);
  const [email,      setEmail]      = useState("");
  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [tenantName, setTenantName] = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      if (isLogin) {
        const res  = await fetch("http://localhost:8000/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.error?.message || data.detail || "Login failed");
        localStorage.setItem("token", data.data.access_token);
        navigate("/dashboard");
      } else {
        const res  = await fetch("http://localhost:8000/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_name: tenantName, username, email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.error?.message || data.detail || "Signup failed");
        setSuccess("Account created! Please sign in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => { setIsLogin(v => !v); setError(""); setSuccess(""); };

  return (
    <div className="min-h-screen bg-[#E0E5EC] flex items-center justify-center p-4 font-sans relative overflow-hidden">

      {/* Ambient blobs — same style as rest of app */}
      <div className="absolute top-[-8%] left-[-6%] w-[420px] h-[420px] rounded-full soft-extruded opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-8%] right-[-6%] w-[380px] h-[380px] rounded-full soft-inset opacity-20 pointer-events-none" />

      {/* ── Card ─────────────────────────────────────────────────────── */}
      <div className="w-full max-w-[920px] soft-extruded rounded-[40px] overflow-hidden flex flex-col md:flex-row relative z-10">

        {/* ── LEFT — Brand Panel ──────────────────────────────────────── */}
        <div className="md:w-[42%] bg-[#6C63FF] relative flex flex-col justify-between p-10 overflow-hidden">

          {/* Decorative circles */}
          <div className="absolute top-[-60px] right-[-60px] w-64 h-64 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-[-80px] left-[-40px] w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-[40%] left-[60%] w-32 h-32 rounded-full bg-white/8 pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Zap size={20} className="text-white" />
              </div>
              <span className="text-white font-extrabold text-xl tracking-tight">
                Marketing<span className="opacity-70">OS</span>
              </span>
            </div>

            <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight mb-4">
              Your AI-powered<br />marketing hub.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Automate strategy, run agentic campaigns, and gain real-time insights — all in one workspace.
            </p>
          </div>

          {/* Features */}
          <div className="relative z-10 space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-white/80 text-sm font-semibold">{label}</span>
              </div>
            ))}
          </div>

          {/* Bottom badge */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              <span className="text-white/70 text-xs font-medium">AI agents active 24/7</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Form Panel ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center p-10 bg-[#E0E5EC]">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-[#3D4852] tracking-tight">
              {isLogin ? "Welcome back 👋" : "Get started free"}
            </h1>
            <p className="text-[#6B7280] text-sm font-medium mt-1">
              {isLogin
                ? "Sign in to continue to your workspace."
                : "Create your account and workspace in seconds."}
            </p>
          </div>

          {/* Tab Toggle */}
          <div className="flex soft-inset rounded-2xl p-1.5 gap-1.5 mb-7">
            {[{ label: "Sign In", val: true }, { label: "Sign Up", val: false }].map(({ label, val }) => (
              <button
                key={label}
                type="button"
                onClick={() => { setIsLogin(val); setError(""); setSuccess(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isLogin === val
                    ? "soft-extruded-sm text-[#6C63FF]"
                    : "text-[#A0AEC0] hover:text-[#6B7280]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-3 soft-inset px-4 py-3 rounded-2xl mb-5 text-sm font-semibold text-red-500">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 soft-inset px-4 py-3 rounded-2xl mb-5 text-sm font-semibold text-teal-600">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Signup-only fields */}
            {!isLogin && (
              <>
                <NeoInput
                  id="tenantName" label="Workspace / Company Name"
                  value={tenantName} onChange={setTenantName}
                  placeholder="Acme Corp" icon={Building2} required
                />
                <NeoInput
                  id="email" label="Email Address" type="email"
                  value={email} onChange={setEmail}
                  placeholder="you@example.com" icon={Mail} required
                />
              </>
            )}

            <NeoInput
              id="username" label="Username"
              value={username} onChange={setUsername}
              placeholder="username123" icon={User} required
            />

            <NeoInput
              id="password" label="Password"
              type={showPass ? "text" : "password"}
              value={password} onChange={setPassword}
              placeholder="••••••••" icon={Lock} required
              rightEl={
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="text-[#A0AEC0] hover:text-[#6B7280] transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 soft-btn-primary rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" />Processing…</>
                : <>{isLogin ? "Sign In" : "Create Account"}<ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-sm text-[#6B7280] font-medium mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={switchMode}
              className="text-[#6C63FF] font-bold hover:underline focus:outline-none transition-colors"
            >
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
