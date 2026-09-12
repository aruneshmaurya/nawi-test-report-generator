import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scale, Lock, Mail, Building2, AlertCircle, Loader2 } from 'lucide-react';
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

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
    e.preventDefault();
    setError(null);

    if (!labId) {
      setError('Please select an authorized testing laboratory.');
      return;
    }

    setLoading(true);
    const result = await login(email, password, labId);
    setLoading(false);

    if (result.success) {
      toast.success('Authentication successful. Welcome to NAWI Portal!');
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-[#06182c] via-[#0b2545] to-[#134074] p-4 font-sans relative overflow-hidden">
      {/* Subtle background national security pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      <Card className="w-full max-w-lg shadow-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md overflow-hidden relative z-10 rounded-2xl">
        {/* Official Government Header Banner */}
        <div className="bg-gradient-to-r from-[#0b2545] via-[#134074] to-[#0b2545] p-6 text-center text-white relative">
          {/* Top Indian Tricolor Strip Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 flex">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#138808]" />
          </div>

          {/* Official Department of Consumer Affairs Logo */}
          <div className="flex justify-center items-center mb-3 mt-1">
            <div className="bg-white/95 p-2 rounded-xl shadow-md border border-white/40">
              <img
                src="/doca_logo.png"
                alt="Department of Consumer Affairs / उपभोक्ता मामले विभाग"
                className="h-14 sm:h-16 object-contain mx-auto"
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <p className="text-[11px] font-medium tracking-wide text-sky-200">
              भारत सरकार • GOVERNMENT OF INDIA
            </p>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
              National Legal Metrology Portal
            </h1>
            <p className="text-xs text-sky-100 font-medium">
              Non-Automatic Weighing Instruments (NAWI) • OIML R-76 & Legal Metrology Act, 2009
            </p>
          </div>

          <div className="mt-3 inline-flex items-center space-x-1.5 bg-sky-950/60 border border-sky-400/30 px-3 py-1 rounded-full text-[11px] text-sky-200 font-medium shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Authorized Metrology Testing Officers & Laboratory Signatories</span>
          </div>
        </div>

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

            {/* Input 1: Tester ID / Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                Official Email / Officer ID <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9 text-sm border-slate-300 focus:border-[#0b2545] focus:ring-[#0b2545]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. tester@nawi-lab.test"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Input 2: Password (Masked) */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9 text-sm border-slate-300 focus:border-[#0b2545] focus:ring-[#0b2545]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
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
              className="w-full bg-[#0b2545] hover:bg-[#134074] text-white font-bold py-2.5 text-sm shadow-md transition-all h-10"
              disabled={loading || labsLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Credentials with NIC / Registry...
                </>
              ) : (
                'Secure Portal Login'
              )}
            </Button>
            
            <div className="w-full border-t border-slate-200/80 pt-3 text-center space-y-1">
              <p className="text-[11px] font-medium text-slate-600">
                Department of Consumer Affairs • Legal Metrology Division
              </p>
              <p className="text-[10px] text-slate-400">
                Standard Weights and Measures • Government of India Metrological Testing Network
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
