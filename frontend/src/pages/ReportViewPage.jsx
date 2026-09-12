import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  ArrowLeft,
  Download,
  ShieldCheck,
  QrCode,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Scale,
  Building2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

export const ReportViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { session, instrument, refetchSession } = context;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Digital Sign Modal State
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [designation, setDesignation] = useState('Director of Metrology / Authorized Signatory');
  const [signing, setSigning] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      // Look up reports for this session
      const res = await apiClient.get('/reports');
      if (res.data?.success && Array.isArray(res.data?.data?.reports)) {
        const matching = res.data.data.reports.find((r) => r.session_id === id);
        if (matching) {
          setReport(matching);
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post(`/sessions/${id}/reports`);
      if (res.data?.success && res.data?.data?.report) {
        setReport(res.data.data.report);
        toast.success('Certificate generated successfully!');
        if (typeof refetchSession === 'function') {
          await refetchSession();
        }
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
      toast.error(err.response?.data?.message || 'Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!report?.report_number) return;
    const url = `${window.location.origin}/verify/${report.report_number}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Public verification URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDigitalSign = async () => {
    if (!report?.id) return;
    setSigning(true);
    try {
      // Mock generated electronic signature stamp data URL
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 300, 100);
      ctx.strokeStyle = '#0b2545';
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 5, 290, 90);
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#0b2545';
      ctx.fillText('DIGITALLY SIGNED & VERIFIED', 20, 35);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`Designation: ${designation}`, 20, 58);
      ctx.fillText(`Date: ${new Date().toISOString()}`, 20, 78);
      const signatureDataUrl = canvas.toDataURL('image/png');

      const res = await apiClient.post(`/reports/${report.id}/sign`, {
        designation,
        signature_image: signatureDataUrl,
      });

      if (res.data?.success) {
        toast.success('Report digitally signed & endorsed!');
        setReport((prev) => ({ ...prev, is_signed: true }));
        setSignModalOpen(false);
        if (typeof refetchSession === 'function') {
          await refetchSession();
        }
      }
    } catch (err) {
      console.error('Failed to sign report:', err);
      toast.error(err.response?.data?.message || 'Failed to sign report');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        <p className="text-sm font-medium text-slate-600">Loading certificate records...</p>
      </div>
    );
  }

  // If no report generated yet for this session
  if (!report) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate(`/sessions/${id}/summary`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Summary
          </Button>
        </div>

        <Card className="border-slate-200 shadow-sm text-center py-12 px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-4 shadow-sm">
            <FileText className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">Certificate Not Yet Generated</CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-md mx-auto mt-2 mb-6">
            All four evaluation test modules are complete. Click below to render the official OIML R-76 Certificate PDF with embedded QR Code verification token.
          </CardDescription>

          <Button
            onClick={handleGeneratePdf}
            disabled={generating}
            className="bg-[#0b2545] hover:bg-[#134074] text-white font-semibold text-xs px-6 py-2.5 shadow-md"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rendering PDF with Puppeteer...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" /> Generate Official Certificate PDF Now
              </>
            )}
          </Button>
        </Card>
      </div>
    );
  }

  const isPass = report.overall_result === 'PASS';
  const verificationUrl = `${window.location.origin}/verify/${report.report_number}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/sessions/${id}/summary`)}
            className="text-xs border-slate-300"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Summary
          </Button>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-base font-bold text-slate-900">{report.report_number}</span>
            <Badge variant={isPass ? 'pass' : 'fail'} className="text-xs font-bold">
              {report.overall_result}
            </Badge>
            {report.is_signed && (
              <Badge variant="approved" className="text-xs flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3" />
                <span>SIGNED</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!report.is_signed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSignModalOpen(true)}
              className="text-xs border-slate-300 text-slate-700"
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Digital Sign
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs border-slate-300"
          >
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? 'Link Copied' : 'Copy Verify URL'}
          </Button>

          {report.pdf_url && (
            <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-semibold">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Main Certificate Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Embedded PDF Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-sky-600" />
                <CardTitle className="text-sm font-bold text-slate-900">Certificate PDF Document</CardTitle>
              </div>
              {report.pdf_url && (
                <a
                  href={report.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center space-x-1"
                >
                  <span>Open in Full Tab</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {report.pdf_url ? (
                <iframe
                  src={`${report.pdf_url}#toolbar=1`}
                  title={`Certificate - ${report.report_number}`}
                  className="w-full h-[720px] bg-slate-100 border-0"
                />
              ) : (
                <div className="flex h-96 items-center justify-center text-xs text-slate-400">
                  PDF document path unavailable
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Verification & QR Code Security Card */}
        <div className="space-y-4">
          {/* QR Code Card */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <QrCode className="h-4 w-4 text-sky-600" />
                <span>QR Verification Token</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Scan with any smartphone camera to verify certificate authenticity on the public metrology portal.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
              {report.qr_code ? (
                <div className="p-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm">
                  <img
                    src={report.qr_code}
                    alt="Certificate QR Verification Code"
                    className="w-44 h-44 object-contain"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                  QR Token Generated
                </div>
              )}

              <div className="space-y-1 w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Public Verification Link
                </span>
                <p className="font-mono text-xs text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {verificationUrl}
                </p>
              </div>

              <Link to={`/verify/${report.report_number}`} target="_blank" className="w-full">
                <Button variant="outline" size="sm" className="w-full text-xs border-slate-300 text-sky-700 hover:bg-sky-50">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Test Public Verification Page
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Certificate Metadata Card */}
          <Card className="border-slate-200 shadow-sm bg-white text-xs">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Certificate Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Report Number</span>
                <span className="font-mono font-bold text-slate-900">{report.report_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Overall Result</span>
                <Badge variant={isPass ? 'pass' : 'fail'} className="text-[10px]">
                  {report.overall_result}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Instrument Model</span>
                <span className="font-semibold text-slate-800">{instrument?.model || 'XP205'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Serial Number</span>
                <span className="font-mono font-semibold text-slate-800">{instrument?.serial_number || '--'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Generated Date</span>
                <span className="text-slate-800">
                  {new Date(report.generated_at || Date.now()).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Digital Sign Modal Dialog */}
      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Digital Sign & Endorse Certificate</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sign off on this evaluation report with your official laboratory designation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="signDesignation" className="text-xs font-semibold text-slate-700">
                Official Designation / Title
              </Label>
              <Input
                id="signDesignation"
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Director of Metrology / Authorized Signatory"
                className="text-xs"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Cryptographic Seal</div>
              <p className="text-[11px] text-slate-500">
                A secure digital signature record linked to report #{report.report_number} will be saved and recorded in the audit trail.
              </p>
            </div>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setSignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDigitalSign}
              disabled={signing || !designation.trim()}
              className="bg-[#0b2545] hover:bg-[#134074] text-white"
            >
              {signing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Apply Digital Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportViewPage;
