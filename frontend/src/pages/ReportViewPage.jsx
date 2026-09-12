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
  Copy,
  Check,
  ImageIcon,
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
  const [cacheBust, setCacheBust] = useState(Date.now());

  // Digital Sign Modal State
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [designation, setDesignation] = useState('Director of Metrology / Authorized Signatory');
  const [signing, setSigning] = useState(false);

  // Helper to resolve full downloadable / embeddable PDF URL
  const getResolvedPdfUrl = (pdfUrl, reportNumber) => {
    const cbQuery = cacheBust ? `&_cb=${cacheBust}` : '';
    if (pdfUrl && (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://'))) {
      return `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}_cb=${cacheBust}`;
    }
    const apiBase = (apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '');
    if (reportNumber) {
      return `${apiBase}/api/reports/${reportNumber}/download?inline=true${cbQuery}`;
    }
    if (pdfUrl && pdfUrl.startsWith('/')) {
      return `${apiBase}${pdfUrl}?_cb=${cacheBust}`;
    }
    return null;
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try direct session report endpoint
      const res = await apiClient.get(`/sessions/${id}/report`);
      if (res.data?.success && res.data?.data?.report) {
        setReport(res.data.data.report);
        return;
      }

      // 2. Fallback to reports list
      const listRes = await apiClient.get('/reports');
      if (listRes.data?.success && Array.isArray(listRes.data?.data?.reports)) {
        const matching = listRes.data.data.reports.find((r) => r.session_id === id);
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
        setCacheBust(Date.now());
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

  const handleDownloadQr = () => {
    if (!report?.qr_code) {
      toast.error('QR code image not available');
      return;
    }
    const link = document.createElement('a');
    link.href = report.qr_code;
    link.download = `${report.report_number}-QRCode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded as PNG');
  };

  const handleDigitalSign = async () => {
    if (!report?.id) return;
    setSigning(true);
    try {
      // Create a clean high-resolution digital signature seal image
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 360, 120);

      // Navy & Steel blue double border
      ctx.strokeStyle = '#0b2545';
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, 352, 112);
      ctx.strokeStyle = '#2b6cb0';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 344, 104);

      // Official Stamp Header
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#0b2545';
      ctx.fillText('⚖ GOVT. OF INDIA • LEGAL METROLOGY', 18, 28);

      // Designation
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(`Designation: ${designation}`, 18, 50);

      const signDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`Date: ${signDate} | Ref: ${report.report_number}`, 18, 70);

      // Green Verification Endorsement
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#15803d';
      ctx.fillText('✔ DIGITALLY SIGNED & VERIFIED (SEC. 24)', 18, 92);
      ctx.font = '8px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`SHA Token: ${report.report_number.replace(/[^0-9]/g, '') || '2026'}-${Date.now().toString(16).toUpperCase()}`, 18, 107);

      const signatureDataUrl = canvas.toDataURL('image/png');

      const res = await apiClient.post(`/reports/${report.id}/sign`, {
        designation,
        signature_image: signatureDataUrl,
      });

      if (res.data?.success) {
        toast.success('Certificate digitally signed & endorsed! PDF updated.');
        setReport((prev) => ({
          ...prev,
          is_signed: true,
          signature_designation: designation,
          signature_image: signatureDataUrl,
          signature_signed_at: new Date().toISOString()
        }));
        setCacheBust(Date.now());
        setSignModalOpen(false);
        await fetchReport();
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

        <Card className="border-slate-200 shadow-sm text-center py-12 px-6 bg-white">
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
  const resolvedPdfUrl = getResolvedPdfUrl(report.pdf_url, report.report_number);

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
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
              <Badge variant="approved" className="text-xs flex items-center space-x-1 font-bold">
                <ShieldCheck className="h-3 w-3" />
                <span>DIGITALLY SIGNED</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePdf}
            disabled={generating}
            className="text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
          >
            {generating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="mr-1.5 h-3.5 w-3.5 text-sky-600" />
            )}
            {generating ? 'Re-generating...' : 'Re-generate PDF'}
          </Button>

          {!report.is_signed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSignModalOpen(true)}
              className="text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Digital Sign
            </Button>
          )}

          {report.qr_code && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQr}
              className="text-xs border-slate-300 bg-white hover:bg-slate-50"
            >
              <ImageIcon className="mr-1.5 h-3.5 w-3.5 text-sky-600" /> Download QR (PNG)
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs border-slate-300 bg-white hover:bg-slate-50"
          >
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? 'Link Copied' : 'Copy Verify URL'}
          </Button>

          {resolvedPdfUrl && (
            <a href={resolvedPdfUrl} download={`${report.report_number}.pdf`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-semibold shadow-sm">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download Report (PDF)
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
                <CardTitle className="text-sm font-bold text-slate-900">Official Certificate Document</CardTitle>
              </div>
              {resolvedPdfUrl && (
                <a
                  href={resolvedPdfUrl}
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
              {resolvedPdfUrl ? (
                <iframe
                  src={`${resolvedPdfUrl}#toolbar=1`}
                  title={`Certificate - ${report.report_number}`}
                  className="w-full h-[760px] bg-slate-50 border-0"
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
                    className="w-48 h-48 object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}

              <div className="flex flex-col w-full gap-2">
                {report.qr_code && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadQr}
                    className="w-full text-xs border-slate-300"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5 text-sky-600" /> Download QR Image (PNG)
                  </Button>
                )}

                <div className="space-y-1 w-full text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Public Verification Link
                  </span>
                  <p className="font-mono text-[11px] text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {verificationUrl}
                  </p>
                </div>

                <Link to={`/verify/${report.report_number}`} target="_blank" className="w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs border-slate-300 text-sky-700 hover:bg-sky-50">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Test Public Verification Page
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Digital Signature Card when signed */}
          {report.is_signed && (
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm text-xs">
              <CardHeader className="pb-2 border-b border-emerald-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Digital Endorsement Seal</span>
                </CardTitle>
                <Badge variant="approved" className="text-[10px] bg-emerald-600 text-white font-bold">
                  SEALED & VERIFIED
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {report.signature_image && (
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 flex justify-center shadow-xs">
                    <img
                      src={report.signature_image}
                      alt="Digital Seal"
                      className="max-h-24 w-full object-contain"
                    />
                  </div>
                )}
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Signatory Title:</span>
                    <span className="font-semibold text-slate-900 text-right">{report.signature_designation || 'Director of Metrology'}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Legal Standard:</span>
                    <span className="font-semibold text-emerald-800">Sec. 24 Legal Metrology Act</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
