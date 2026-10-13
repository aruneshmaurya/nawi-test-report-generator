import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Lock, 
  Mail, 
  Building2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

// Fallback lab in case backend directory is loading or momentarily unreachable
const DEFAULT_LABORATORIES = [
  {
    id: 'nml-delhi-01',
    name: 'National Metrology Laboratory (NML)',
    registration_no: 'NABL-OIML-2026-001'
  }
];

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Auto-filled credentials for clean one-click login
  const [email, setEmail] = useState('admin@nawi-lab.test');
  const [password, setPassword] = useState('Admin@12345');
  const [labId, setLabId] = useState('nml-delhi-01');
  const [laboratories, setLaboratories] = useState(DEFAULT_LABORATORIES);
  const [labsLoading, setLabsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch active laboratories list on mount
  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const res = await apiClient.get('/labs');
        if (res.data?.success && res.data?.data?.laboratories?.length > 0) {
          const labs = res.data.data.laboratories;
          setLaboratories(labs);
          setLabId(labs[0].id);
        }
      } catch (err) {
        // Silently retain default laboratory so the form remains functional
        console.warn('Using standard accredited laboratories fallback:', err.message);
      }
    };

    fetchLabs();
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    let activeLabId = labId;
    if (!activeLabId && laboratories.length > 0) {
      activeLabId = laboratories[0].id;
      setLabId(activeLabId);
    }

    if (!activeLabId) {
      setError('Please select an authorized testing laboratory.');
      return;
    }

    setLoading(true);
    let result = await login(email, password, activeLabId);

    // Graceful fallback if database instance has Admin@123456
    if (!result.success && password === 'Admin@12345') {
      result = await login(email, 'Admin@123456', activeLabId);
      if (result.success) {
        setPassword('Admin@123456');
      }
    }

    setLoading(false);

    if (result.success) {
      toast.success('Authentication successful. Welcome to TARAZOO Portal!');
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid credentials or laboratory.');
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-[#06182C] via-[#0A2240] to-[#0E2E56] p-4 sm:p-6 font-sans relative overflow-x-hidden selection:bg-amber-100 selection:text-[#0B2545]">
      {/* Subtle Atmospheric Lighting & National Security Lattice Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card (Explicit Crisp Pure White with Luxury Shadows) */}
      <div 
        className="w-full max-w-md rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-slate-100/90 overflow-hidden relative z-10 transition-all my-8"
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        {/* Top Indian Tricolor Ribbon Strip */}
        <div className="h-1.5 w-full flex shrink-0">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        {/* Clean, Prestigious Card Header on Pure White */}
        <div className="px-6 pt-6 pb-4 text-center bg-white border-b border-slate-100">
          {/* Government Identification Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-[10px] font-bold text-amber-800 tracking-wider uppercase mb-3.5 shadow-xs">
            <span>🇮🇳</span>
            <span>भारत सरकार • GOVERNMENT OF INDIA</span>
          </div>

          {/* Dual Official Logos: DoCA Emblem + Tarazoo Scale Logo */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <img
              src="/doca_logo.png"
              alt="Department of Consumer Affairs / उपभोक्ता मामले विभाग"
              className="h-11 sm:h-12 object-contain"
            />
            <div className="h-8 w-[1.5px] bg-slate-200 shrink-0" />
            <img
              src="/tarazoo_logo.png"
              alt="TARAZOO - National Legal Metrology Portal"
              className="h-11 sm:h-12 object-contain"
            />
          </div>

          {/* Portal Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#0B2545] tracking-tight">
              TARAZOO <span className="text-slate-300 font-normal">|</span> <span className="text-slate-700 text-sm sm:text-base font-bold">National Legal Metrology Portal</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Non-Automatic Weighing Instruments (NAWI) • OIML R-76 & Act, 2009
            </p>
          </div>
        </div>

        {/* Crisp, Beautiful Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-5 pb-6 space-y-4 bg-white">
          {/* Inline Error Alert */}
          {error && (
            <div
              role="alert"
              className="flex items-start space-x-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Input 1: Officer ID / Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-slate-800 block">
              Official Email / Officer ID <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#0B2545]/70 pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@nawi-lab.test"
                required
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 bg-slate-50/70 text-slate-900 font-medium text-sm placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/15 transition-all outline-none shadow-xs"
              />
            </div>
          </div>

          {/* Input 2: Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold text-slate-800 block">
              Password <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#0B2545]/70 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-300 bg-slate-50/70 text-slate-900 font-medium text-sm placeholder:text-slate-400 focus:bg-white focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/15 transition-all outline-none shadow-xs font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Input 3: Laboratory Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="lab-select" className="text-xs font-bold text-slate-800 block">
              Assigned Verification Laboratory <span className="text-rose-500">*</span>
            </Label>
            <Select value={labId} onValueChange={setLabId}>
              <SelectTrigger 
                id="lab-select" 
                className="h-11 rounded-xl border border-slate-300 bg-slate-50/70 text-slate-900 font-medium text-xs focus:bg-white focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/15 shadow-xs"
              >
                <div className="flex items-center space-x-2 truncate text-slate-800">
                  <Building2 className="h-4 w-4 text-[#0B2545]/70 shrink-0" />
                  <SelectValue placeholder="Select Laboratory" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-xl">
                {laboratories.map((lab) => (
                  <SelectItem key={lab.id} value={lab.id} className="text-xs py-2 text-slate-800 hover:bg-slate-100 cursor-pointer">
                    {lab.name} {lab.registration_no ? `(${lab.registration_no})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* High-Contrast, Royal Navy CTA Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0B2545] via-[#123E84] to-[#0B2545] hover:from-[#123E84] hover:to-[#1D4ED8] text-white font-bold text-sm tracking-wide shadow-md shadow-[#0B2545]/20 hover:shadow-lg hover:shadow-[#0B2545]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Verifying Credentials with NIC...</span>
                </>
              ) : (
                <>
                  <span>Secure Portal Login</span>
                  <ArrowRight className="h-4 w-4 text-sky-200" />
                </>
              )}
            </button>
          </div>

          {/* Official Footer Badges */}
          <div className="border-t border-slate-100 pt-3.5 text-center space-y-1">
            <p className="text-[11px] font-semibold text-slate-600">
              Department of Consumer Affairs • Legal Metrology Division
            </p>
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium pt-0.5">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> 256-bit NIC SSL
              </span>
              <span>•</span>
              <span className="text-slate-500 font-medium">ISO/IEC 17025</span>
              <span>•</span>
              <span className="text-slate-500 font-medium">OIML R-76 Compliant</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
