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
    <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-[#0b2545] via-[#134074] to-[#1d3557] p-4 font-sans">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-white/95 backdrop-blur-md">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b2545] text-sky-400 shadow-lg">
            <Scale className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-[#0b2545]">
            NAWI Test Portal — Login
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Legal Metrology Act 2009 & OIML R-76 Verification Platform
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Tester ID / Username
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9 text-sm"
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
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Input 3: Lab Name Select */}
            <div className="space-y-1.5">
              <Label htmlFor="lab-select" className="text-xs font-semibold text-slate-700">
                Testing Laboratory
              </Label>
              {labsLoading ? (
                <div className="flex h-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading laboratories...
                </div>
              ) : (
                <Select value={labId} onValueChange={setLabId}>
                  <SelectTrigger id="lab-select" className="text-xs font-medium">
                    <div className="flex items-center space-x-2 truncate">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
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

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full bg-[#0b2545] hover:bg-[#134074] text-white font-semibold py-2 text-sm shadow-md transition-all"
              disabled={loading || labsLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Login'
              )}
            </Button>
            <div className="text-[11px] text-center text-slate-400">
              Government Metrological Calibration & Testing Infrastructure
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
