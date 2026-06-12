import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, Eye, EyeOff, User, Mail, Lock,
  Building2, ArrowRight, Loader2,
  AlertCircle, CheckCircle2, BarChart3, Brain, Target
} from "lucide-react";
import Input from "../UI/Input";
import Button from "../UI/Button";
import Card from "../UI/Card";

const FEATURES = [
  { icon: BarChart3, label: "AI-Driven Analytics" },
  { icon: Brain,     label: "Agentic Workflows" },
  { icon: Target,    label: "Strategy Planning" },
];

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
        const res  = await fetch(`${import.meta.env.VITE_BACKEND_API}/auth/login`, {
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
        const res  = await fetch(`${import.meta.env.VITE_BACKEND_API}/auth/signup`, {
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-200">

        {/* ── LEFT — Brand Panel ──────────────────────────────────────── */}
        <div className="md:w-[45%] bg-primary-900 relative flex flex-col justify-between p-10 lg:p-12 overflow-hidden">
          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm">
                <Zap size={20} className="text-white" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">
                Fasto<span className="text-primary-400">Click</span>
              </span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-6">
              The professional<br />marketing hub.
            </h2>
            <p className="text-primary-100 text-base leading-relaxed">
              Automate strategy, run agentic campaigns, and gain real-time insights — all in one enterprise workspace.
            </p>
          </div>

          {/* Features */}
          <div className="relative z-10 space-y-5 mt-12">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-800/50 border border-primary-700 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-primary-300" />
                </div>
                <span className="text-white text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* Background decoration */}
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary-800/50 blur-3xl" />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-800/50 blur-3xl" />
        </div>

        {/* ── RIGHT — Form Panel ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center p-10 lg:p-16 bg-white relative">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              {isLogin
                ? "Enter your credentials to access your workspace."
                : "Join FastoClick to start managing your marketing campaigns."}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md mb-6 text-sm text-danger">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-md mb-6 text-sm text-success">
              <CheckCircle2 size={16} className="shrink-0" />
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Signup-only fields */}
            {!isLogin && (
              <div className="space-y-5">
                <Input
                  id="tenantName" label="Workspace Name"
                  value={tenantName} onChange={e => setTenantName(e.target.value)}
                  placeholder="Acme Corp" required
                />
                <Input
                  id="email" label="Email Address" type="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                />
              </div>
            )}

            <Input
              id="username" label="Username"
              value={username} onChange={e => setUsername(e.target.value)}
              placeholder="username" required
            />

            <div className="relative">
              <Input
                id="password" label="Password"
                type={showPass ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              fullWidth
              size="lg"
              className="mt-6"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin mr-2" />Processing...</>
                : <>{isLogin ? "Sign In" : "Create Account"}</>
              }
            </Button>
          </form>

          {/* Switch mode */}
          <div className="mt-8 text-center text-sm text-slate-500 border-t border-slate-100 pt-8">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
