import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldCheck, ShieldAlert, Loader2, Scale, Building2, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/apiClient';

export const PublicVerifyPage = () => {
  const { reportNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const fetchVerification = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/verify/${reportNumber}`);
        if (res.data?.success && res.data?.verification_status === 'VERIFIED') {
          setData(res.data.data);
          setVerified(true);
        } else {
          setVerified(false);
        }
      } catch {
        setVerified(false);
      } finally {
        setLoading(false);
      }
    };

    if (reportNumber) {
      fetchVerification();
    }
  }, [reportNumber]);

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="w-full max-w-md space-y-4">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b2545] text-sky-400 shadow-md">
            <Scale className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-[#0b2545]">National Legal Metrology Portal</h1>
          <p className="text-xs text-slate-500">Official OIML R-76 Certificate Verification</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="text-center pb-4">
            {loading ? (
              <div className="flex flex-col items-center py-6 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                <p className="text-xs font-medium text-slate-600">Verifying certificate integrity...</p>
              </div>
            ) : verified ? (
              <div className="space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <CardTitle className="text-lg font-bold text-emerald-700">AUTHENTIC CERTIFICATE</CardTitle>
                <CardDescription className="text-xs font-mono text-slate-500">
                  {data?.report_number}
                </CardDescription>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <CardTitle className="text-lg font-bold text-rose-700">CERTIFICATE NOT FOUND</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  No valid verification record exists for "{reportNumber}"
                </CardDescription>
              </div>
            )}
          </CardHeader>

          {verified && data && (
            <CardContent className="space-y-3 pt-0 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 space-y-2 border border-slate-200/80">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Instrument Model</span>
                  <span className="font-semibold text-slate-800">{data.instrument_model}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Serial Number</span>
                  <span className="font-mono font-semibold text-slate-800">{data.serial_number}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Accuracy Class</span>
                  <span className="font-semibold text-slate-800">{data.accuracy_class}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Overall Result</span>
                  <Badge variant={data.overall_result === 'PASS' ? 'pass' : 'fail'}>
                    {data.overall_result}
                  </Badge>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Issuing Laboratory</span>
                  <span className="font-medium text-slate-800 text-right">{data.issuing_lab_name}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 justify-center pt-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>Digitally signed and cryptographically validated</span>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PublicVerifyPage;
