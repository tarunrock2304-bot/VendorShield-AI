import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Mail, User, Lock, ChevronDown, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { getStoredAccounts } from '../lib/demo-auth';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string }> = [
  { value: 'admin', label: 'Admin', description: 'Full platform access' },
  { value: 'analyst', label: 'Analyst', description: 'Risk and monitoring access' },
  { value: 'auditor', label: 'Auditor', description: 'Read-only compliance access' },
];


export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [storedAccounts, setStoredAccounts] = useState(() => getStoredAccounts());

  useEffect(() => {
    setStoredAccounts(getStoredAccounts());
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn({
      fullName,
      email,
      password,
      role,
    });

    if (!result.success) {
      setError(result.message || 'Login failed.');
      setLoading(false);
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center px-4 py-4 sm:py-6">
      <div className="w-full max-w-[1500px] overflow-hidden rounded-[28px] shadow-[0_30px_80px_rgba(15,23,42,0.12)] grid lg:grid-cols-[1.03fr_1.02fr] min-h-[560px]">
        <section className="relative overflow-hidden bg-[#060b1a] text-white px-5 sm:px-8 lg:px-10 py-4 lg:py-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.20),transparent_22%),linear-gradient(135deg,#050816_0%,#08112b_55%,#09183b_100%)]" />
          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.20),transparent_20%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.16),transparent_18%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-5 lg:gap-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.35)]">
                <ShieldCheck className="h-7 w-7 text-indigo-300" />
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight">VendorShield AI</div>
                <div className="text-sm text-slate-300">Third-Party & Vendor Risk Management Platform</div>
              </div>
            </div>

            <div className="max-w-xl space-y-4 lg:space-y-5">
              <div className="space-y-2.5 lg:space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                  Secure demo access
                </p>
                <h1 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight">
                  AI-Powered Vendor Risk Intelligence
                </h1>
                <p className="text-sm lg:text-base text-slate-300 leading-relaxed max-w-lg">
                  Assess, monitor, and mitigate third-party risk with a focused demo login that mirrors the dashboard experience.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                  <div className="text-sm font-semibold text-white">Continuous Monitoring</div>
                  <div className="mt-1 text-sm text-slate-300">Real-time risk visibility and alerts.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                  <div className="text-sm font-semibold text-white">Compliance & Governance</div>
                  <div className="mt-1 text-sm text-slate-300">Track controls, certifications, and audit posture.</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm shadow-2xl shadow-indigo-950/30">
              <div className="flex items-center gap-3 text-sm font-semibold text-indigo-200">
                <HelpCircle className="h-4 w-4" />
                Demo Credentials
              </div>
              <div className="mt-2.5 grid gap-2 text-sm text-slate-200 sm:grid-cols-3">
                {storedAccounts.map((item) => (
                  <div key={item.id} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 overflow-hidden">
                    <div className="font-semibold text-white text-sm">{item.roleLabel}</div>
                    <div className="mt-1 space-y-0.5 text-slate-300 text-[11px] lg:text-xs leading-snug break-words">
                      <div><span className="font-medium text-slate-100">Full name:</span> {item.fullName}</div>
                      <div><span className="font-medium text-slate-100">Email:</span> {item.email}</div>
                      <div><span className="font-medium text-slate-100">Role:</span> {item.roleLabel}</div>
                      <div><span className="font-medium text-slate-100">Password:</span> {item.password}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 sm:px-8 lg:px-10 py-4 lg:py-5 bg-[#f8faff]">
          <div className="w-full max-w-[460px] space-y-2">
            

            <div className="rounded-[24px] border border-slate-200 bg-white p-4.5 lg:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
              <div className="text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome Back</h2>
                <p className="mt-1.5 text-sm text-slate-500">Sign in to access your Vendor Risk Dashboard</p>
              </div>

              <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
                <label className="block space-y-2">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Full Name</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      required
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Email Address</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      required
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Role</span>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value as UserRole)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-11 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-600">
                Use only the demo full name, email, password, and role combinations shown on the left.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
