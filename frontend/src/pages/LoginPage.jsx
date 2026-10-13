import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Scale, 
  Lock, 
  Mail, 
  Building2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Zap, 
  KeyRound, 
  ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [labId, setLabId] = useState('');
  const [laboratories, setLaboratories] = useState([]);
  const [labsLoading, setLabsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);

  // Fetch active laboratories list on mount
  useEffect(() => {
    const fetchLabs = async () => {
      setLabsLoading(true);
      try {
        const res = await apiClient.get('/labs');
        if (res.data?.success && res.data?.data?.laboratories) {
          const labs = res.data.data.laboratories;
          setLaboratories(labs);
          // Pre-select first laboratory if available
          if (labs.length > 0) {
            setLabId(labs[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load laboratories:', err);
        toast.error('Could not connect to testing laboratories directory');
      } finally {
        setLabsLoading(false);
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
    const result = await login(email, password, activeLabId);
    setLoading(false);

    if (result.success) {
      toast.success('Authentication successful. Welcome to TARAZOO Portal!');
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  /**
   * One-Click Auto-Login Feature:
   * Fills the email, password, selects the laboratory, and immediately
   * authenticates the user into the portal with graceful password fallback.
   */
  const handleAutoLogin = async (
    targetEmail = 'admin@nawi-lab.test',
    targetPassword = 'Admin@12345'
  ) => {
    setError(null);
    setEmail(targetEmail);
    setPassword(targetPassword);

    let activeLabId = labId;
    if (!activeLabId && laboratories.length > 0) {
      activeLabId = laboratories[0].id;
      setLabId(activeLabId);
    }

    if (!activeLabId) {
      if (labsLoading) {
        toast.info('Connecting to laboratory registry, please wait a moment...');
        return;
      }
      setError('Please select an authorized laboratory first.');
      return;
    }

    setAutoLoggingIn(true);
    setLoading(true);

    try {
      // First attempt with standard seed password
      let result = await login(targetEmail, targetPassword, activeLabId);

      // Graceful fallback to Admin@123456 if seed differed in specific environments
      if (!result.success && targetPassword === 'Admin@12345') {
        result = await login(targetEmail, 'Admin@123456', activeLabId);
        if (result.success) {
          setPassword('Admin@123456');
        }
      }

      if (result.success) {
        toast.success('Verified! Welcome to TARAZOO National Metrology Portal.');
        navigate('/dashboard');
      } else {
        setError(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setError('Network or server error during auto-login.');
    } finally {
      setLoading(false);
      setAutoLoggingIn(false);
    }
  };

  /**
   * Auto-fill form fields without submitting
   */
  const handleFillDetails = (
    targetEmail = 'admin@nawi-lab.test',
    targetPassword = 'Admin@12345'
  ) => {
    setEmail(targetEmail);
    setPassword(targetPassword);
    if (!labId && laboratories.length > 0) {
      setLabId(laboratories[0].id);
    }
    setError(null);
    toast.info('Credentials entered! Click "Secure Portal Login" or press Enter.');
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-[#041326] via-[#0b2545] to-[#123962] p-4 sm:p-6 font-sans relative overflow-x-hidden">
      {/* Background National Guilloche & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-xl shadow-2xl border border-slate-200/90 bg-white/98 backdrop-blur-md overflow-hidden relative z-10 rounded-2xl">
        {/* Official Government Header Banner */}
        <div className="bg-gradient-to-r from-[#06182c] via-[#0b2545] to-[#06182c] p-6 text-center text-white relative">
          {/* Top Indian Tricolor Strip Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 flex">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#138808]" />
          </div>

          {/* Dual Brand Co-Header: Department of Consumer Affairs & TARAZOO */}
          <div className="flex justify-center items-center gap-3 sm:gap-5 mb-3.5 mt-1.5">
            {/* Government Emblem / DoCA Logo */}
            <div className="bg-white/95 px-3 py-1.5 rounded-xl shadow-md border border-white/50 flex items-center justify-center">
              <img
                src="/doca_logo.png"
                alt="Department of Consumer Affairs / उपभोक्ता मामले विभाग"
                className="h-11 sm:h-12 object-contain"
              />
            </div>

            {/* Tarazoo Full Brand Logo */}
            <div className="bg-white/95 px-3.5 py-1.5 rounded-xl shadow-md border border-white/50 flex items-center justify-center">
              <img
                src="/tarazoo_logo.png"
                alt="TARAZOO - National Legal Metrology Portal"
                className="h-11 sm:h-12 object-contain"
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold tracking-widest text-amber-400 uppercase">
              भारत सरकार • GOVERNMENT OF INDIA
            </p>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>TARAZOO</span>
              <span className="text-amber-400 font-light text-base sm:text-lg">|</span>
              <span className="text-sky-100 font-bold text-sm sm:text-base">National Legal Metrology Portal</span>
            </h1>
            <p className="text-xs text-sky-200/90 font-medium max-w-md mx-auto">
              Non-Automatic Weighing Instruments (NAWI) • OIML R-76 & Legal Metrology Act, 2009
            </p>
          </div>

          <div className="mt-3.5 inline-flex items-center space-x-2 bg-sky-950/70 border border-sky-400/30 px-3 py-1 rounded-full text-[11px] text-sky-200 font-medium shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Authorized Testing Laboratories & Verification Officers Portal</span>
          </div>
        </div>

        {/* Highlighted Demo & Evaluation Access Panel ("Login with details options") */}
        <div className="bg-gradient-to-r from-amber-50 via-sky-50 to-amber-50/60 border-b border-amber-200/80 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-amber-700" />
              </div>
              <span className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">
                Demo & Evaluation Access (त्वरित लॉगिन)
              </span>
            </div>
            <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Zap className="h-2.5 w-2.5 text-emerald-600" />
              <span>One-Click Access</span>
            </span>
          </div>

          {/* Interactive Credential Detail Card */}
          <div className="rounded-xl bg-white border border-slate-200/90 p-3 sm:p-3.5 shadow-sm space-y-2.5 transition-all hover:border-sky-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Officer Role:</span>
                <span className="font-bold text-[#0b2545] flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                  Senior Metrology Officer / Administrator
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-semibold text-slate-500 block">Facility:</span>
                <span className="font-semibold text-slate-700">National Metrology Laboratory (NML)</span>
              </div>
            </div>

            {/* Clickable Credentials Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleFillDetails('admin@nawi-lab.test', 'Admin@12345')}
                className="flex items-center justify-between bg-slate-50 hover:bg-sky-50/80 border border-slate-200 hover:border-sky-300 rounded-lg px-2.5 py-1.5 text-left transition-colors group cursor-pointer"
                title="Click to copy into email field"
              >
                <div className="truncate">
                  <div className="text-[10px] font-medium text-slate-500">Official Email:</div>
                  <div className="font-mono text-xs font-bold text-slate-900 truncate">admin@nawi-lab.test</div>
                </div>
                <span className="text-[10px] text-sky-600 group-hover:underline shrink-0 ml-1">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillDetails('admin@nawi-lab.test', 'Admin@12345')}
                className="flex items-center justify-between bg-slate-50 hover:bg-sky-50/80 border border-slate-200 hover:border-sky-300 rounded-lg px-2.5 py-1.5 text-left transition-colors group cursor-pointer"
                title="Click to copy into password field"
              >
                <div className="truncate">
                  <div className="text-[10px] font-medium text-slate-500">Password:</div>
                  <div className="font-mono text-xs font-bold text-slate-900">Admin@12345</div>
                </div>
                <span className="text-[10px] text-sky-600 group-hover:underline shrink-0 ml-1">Fill</span>
              </button>
            </div>

            {/* Action Buttons: 1-Click Auto Login vs Fill Only */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                onClick={() => handleAutoLogin('admin@nawi-lab.test', 'Admin@12345')}
                disabled={loading || labsLoading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs py-2 h-9 shadow-md transition-all cursor-pointer"
              >
                {autoLoggingIn ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Auto-Authenticating with NIC Registry...
                  </>
                ) : (
                  <>
                    <Zap className="mr-1.5 h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                    Click Here to Auto-Login as Admin
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleFillDetails('admin@nawi-lab.test', 'Admin@12345')}
                className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100 h-9 px-3"
              >
                Fill Form Only
              </Button>
            </div>
          </div>
        </div>

        {/* Regular Login Form */}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 p-6 pt-5">
            {/* Inline Error Banner */}
            {error && (
              <div
                role="alert"
                className="flex items-start space-x-2.5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 animate-in fade-in"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Input 1: Officer ID / Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                  Official Email / Officer ID <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setEmail('admin@nawi-lab.test')}
                  className="text-[11px] text-sky-700 hover:text-sky-900 hover:underline font-medium cursor-pointer"
                >
                  Use: admin@nawi-lab.test
                </button>
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9 text-sm border-slate-300 focus:border-[#0b2545] focus:ring-[#0b2545]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@nawi-lab.test"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Input 2: Password (Masked with toggle) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setPassword('Admin@12345')}
                  className="text-[11px] text-sky-700 hover:text-sky-900 hover:underline font-medium cursor-pointer"
                >
                  Use: Admin@12345
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="pl-9 pr-10 text-sm border-slate-300 focus:border-[#0b2545] focus:ring-[#0b2545]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Input 3: Lab Name Select */}
            <div className="space-y-1.5">
              <Label htmlFor="lab-select" className="text-xs font-bold text-slate-700">
                Assigned Verification Laboratory <span className="text-rose-500">*</span>
              </Label>
              {labsLoading ? (
                <div className="flex h-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-[#0b2545]" /> Loading accredited laboratories...
                </div>
              ) : (
                <Select value={labId} onValueChange={setLabId}>
                  <SelectTrigger id="lab-select" className="text-xs font-medium border-slate-300 bg-white">
                    <div className="flex items-center space-x-2 truncate text-slate-800">
                      <Building2 className="h-3.5 w-3.5 text-[#0b2545] shrink-0" />
                      <SelectValue placeholder="Select Laboratory" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {laboratories.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id} className="text-xs">
                        {lab.name} {lab.registration_no ? `(${lab.registration_no})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 p-6 pt-0">
            <Button
              type="submit"
              className="w-full bg-[#0b2545] hover:bg-[#134074] text-white font-bold py-2.5 text-sm shadow-md transition-all h-10 cursor-pointer"
              disabled={loading || labsLoading}
            >
              {loading && !autoLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Credentials with NIC / Registry...
                </>
              ) : (
                'Secure Portal Login'
              )}
            </Button>
            
            <div className="w-full border-t border-slate-200/80 pt-3 text-center space-y-1">
              <p className="text-[11px] font-semibold text-slate-700">
                Department of Consumer Affairs • Legal Metrology Division
              </p>
              <p className="text-[10px] text-slate-400">
                Standard Weights and Measures • Government of India Metrological Testing Network
              </p>
              <div className="pt-1 flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> 256-bit NIC SSL
                </span>
                <span>•</span>
                <span>ISO/IEC 17025</span>
                <span>•</span>
                <span>OIML R-76 Compliant</span>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;

