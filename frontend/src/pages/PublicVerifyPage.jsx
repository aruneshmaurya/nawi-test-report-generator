import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Scale,
  Building2,
  CheckCircle,
  Calendar,
  Award,
  FileCheck,
  ExternalLink,
  Download,
  Clock,
  Layers,
  MapPin,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ' IST';
    } catch {
      return dateStr;
    }
  };

  const getDownloadUrl = () => {
    if (!data?.report_number) return '#';
    const apiBase = (apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '');
    return `${apiBase}/api/reports/${data.report_number}/download`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200 py-8 px-4 font-sans text-slate-800">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Official Header with National Department Logo */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 text-center space-y-3">
          <div className="flex justify-center items-center">
            <img
              src="/doca_logo.png"
              alt="Department of Consumer Affairs / उपभोक्ता मामले विभाग"
              className="h-16 md:h-20 object-contain mx-auto"
            />
          </div>
          <div className="border-t border-slate-100 pt-3">
            <h1 className="text-base md:text-lg font-bold text-[#0b2545] tracking-tight">
              National Legal Metrology Portal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Official OIML R-76 & Legal Metrology Act, 2009 Digital Verification Registry
            </p>
          </div>
        </div>

        {/* Verification Outcome Card */}
        <Card className="shadow-lg border-slate-200 bg-white overflow-hidden">
          <CardHeader className="text-center pb-4 pt-6 bg-slate-50/50 border-b border-slate-100">
            {loading ? (
              <div className="flex flex-col items-center py-8 space-y-3">
                <Loader2 className="h-9 w-9 animate-spin text-sky-600" />
                <p className="text-xs font-semibold text-slate-600">Querying National Metrology Registry...</p>
              </div>
            ) : verified ? (
              <div className="space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl font-extrabold text-emerald-800 tracking-wide">
                  AUTHENTIC & VERIFIED CERTIFICATE
                </CardTitle>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Report Number:</span>
                  <span className="font-mono text-sm font-bold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded">
                    {data?.report_number}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <CardTitle className="text-lg font-bold text-rose-700">CERTIFICATE RECORD NOT FOUND</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  No valid verification entry found matching identifier "{reportNumber}". This certificate may be invalid or expired.
                </CardDescription>
              </div>
            )}
          </CardHeader>

          {verified && data && (
            <CardContent className="space-y-5 p-5 text-xs">
              {/* Status Banner */}
              <div
                className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  data.overall_result === 'PASS'
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Award className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Overall Compliance Verdict</div>
                    <div className="text-[11px] opacity-80">
                      {data.overall_result === 'PASS'
                        ? 'Compliant with OIML R-76-1:2006 MPE tolerance standards'
                        : 'Non-compliant: Test readings exceeded maximum permissible error limits'}
                    </div>
                  </div>
                </div>
                <Badge variant={data.overall_result === 'PASS' ? 'pass' : 'fail'} className="text-xs font-bold px-3 py-1">
                  {data.overall_result}
                </Badge>
              </div>

              {/* Grid 1: Verification & Timestamp Details */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#0b2545] uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-sky-600" />
                  <span>Verification Timestamp & Compliance</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Date & Time of Verification</span>
                    <p className="font-semibold text-slate-800">{formatDate(data.test_date || data.generated_at)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Verification Type</span>
                    <p className="font-semibold text-slate-800">{data.verification_type}</p>
                  </div>
                  <div className="space-y-0.5 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Governing Standard & Rule</span>
                    <p className="font-semibold text-slate-800">Legal Metrology Act, 2009 & OIML R-76-1:2006</p>
                  </div>
                </div>
              </div>

              {/* Grid 2: Manufacturer & Instrument Details */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#0b2545] uppercase tracking-wider flex items-center space-x-1.5">
                  <Scale className="h-3.5 w-3.5 text-sky-600" />
                  <span>Instrument & Manufacturer Specifications</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Manufacturer / Make</span>
                    <p className="font-semibold text-slate-800">{data.instrument_make}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Instrument Model</span>
                    <p className="font-semibold text-slate-800">{data.instrument_model}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Serial Number</span>
                    <p className="font-mono font-bold text-slate-900">{data.serial_number}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Accuracy Class</span>
                    <p className="font-semibold text-sky-800">{data.accuracy_class}</p>
                  </div>
                </div>
              </div>

              {/* Grid 3: Issuing Laboratory & Legal Endorsement */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#0b2545] uppercase tracking-wider flex items-center space-x-1.5">
                  <Building2 className="h-3.5 w-3.5 text-sky-600" />
                  <span>Issuing Authority & Official Sign-off</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start pb-2.5 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Issuing Laboratory</span>
                      <div className="font-bold text-slate-900 text-sm">{data.issuing_lab_name}</div>
                      {data.issuing_lab_address && (
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span>{data.issuing_lab_address}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Registration No.</span>
                      <div className="font-mono font-semibold text-slate-700">{data.issuing_lab_reg_no}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <div className="space-y-0.5 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Tested By Officer</span>
                      <p className="font-bold text-slate-900 flex items-center space-x-1.5 text-xs mt-0.5">
                        <UserCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <span>{data.tester_name || 'Legal Metrology Officer'}</span>
                      </p>
                    </div>
                    <div className="space-y-0.5 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Digital Endorsement</span>
                      <p className="font-bold text-emerald-800 flex items-center space-x-1.5 text-xs mt-0.5">
                        <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <span>{data.signatory_designation || 'Digitally Sealed'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions & Official Certificate Download */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={getDownloadUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-semibold shadow-sm">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download Official Certificate (PDF)
                  </Button>
                </a>
              </div>

              {/* Cryptographic Footnote */}
              <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500 pt-1 text-center">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  Tamper-proof digital certificate cryptographically recorded in accordance with Section 24 of the Legal Metrology Act, 2009.
                </span>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PublicVerifyPage;

