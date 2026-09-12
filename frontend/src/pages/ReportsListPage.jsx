import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  FileText,
  Search,
  Download,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCw,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

export const ReportsListPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL'); // ALL, PASS, FAIL
  const [signedFilter, setSignedFilter] = useState('ALL'); // ALL, SIGNED, UNSIGNED
  const [sortBy, setSortBy] = useState('NEWEST'); // NEWEST, OLDEST

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reports');
      if (res.data?.success && Array.isArray(res.data?.data?.reports)) {
        setReports(res.data.data.reports);
      }
    } catch (err) {
      console.error('Failed to load reports archive:', err);
      toast.error('Could not load reports registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtered & Sorted Reports
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        // Search query matching
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !q ||
          (r.report_number && r.report_number.toLowerCase().includes(q)) ||
          (r.session_number && r.session_number.toLowerCase().includes(q)) ||
          (r.instrument_model && r.instrument_model.toLowerCase().includes(q)) ||
          (r.serial_number && r.serial_number.toLowerCase().includes(q)) ||
          (r.manufacturer_name && r.manufacturer_name.toLowerCase().includes(q)) ||
          (r.lab_name && r.lab_name.toLowerCase().includes(q));

        // Verdict filter
        const matchesVerdict =
          verdictFilter === 'ALL' ||
          (verdictFilter === 'PASS' && r.overall_result === 'PASS') ||
          (verdictFilter === 'FAIL' && r.overall_result === 'FAIL');

        // Signed filter
        const matchesSigned =
          signedFilter === 'ALL' ||
          (signedFilter === 'SIGNED' && r.is_signed === true) ||
          (signedFilter === 'UNSIGNED' && !r.is_signed);

        return matchesSearch && matchesVerdict && matchesSigned;
      })
      .sort((a, b) => {
        const dateA = new Date(a.generated_at || 0).getTime();
        const dateB = new Date(b.generated_at || 0).getTime();
        return sortBy === 'NEWEST' ? dateB - dateA : dateA - dateB;
      });
  }, [reports, searchTerm, verdictFilter, signedFilter, sortBy]);

  // Statistics
  const totalReports = reports.length;
  const passCount = reports.filter((r) => r.overall_result === 'PASS').length;
  const failCount = reports.filter((r) => r.overall_result === 'FAIL').length;
  const signedCount = reports.filter((r) => r.is_signed).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getDownloadUrl = (report) => {
    if (report.pdf_url && (report.pdf_url.startsWith('http://') || report.pdf_url.startsWith('https://'))) {
      return report.pdf_url;
    }
    const apiBase = (apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '');
    return `${apiBase}/api/reports/${report.report_number}/download`;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Certificates Registry</h1>
          <p className="text-sm text-slate-500">
            Search, filter, preview, and download issued OIML R-76 calibration & verification certificates
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReports}
          disabled={loading}
          className="text-xs border-slate-300 w-fit"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Registry
        </Button>
      </div>

      {/* Summary Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Issued</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalReports}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600">Compliant (PASS)</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{passCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600">Non-Compliant (FAIL)</p>
              <h3 className="text-2xl font-bold text-rose-700 mt-1">{failCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-sky-600">Digitally Signed</p>
              <h3 className="text-2xl font-bold text-sky-800 mt-1">{signedCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card with Search & Filters */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Issued Certificates Archive</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official records with cryptographic QR token bindings and digital signatures
              </CardDescription>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search report, serial, model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              {/* Verdict Filter */}
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value)}
                aria-label="Filter by verdict"
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="ALL">All Verdicts</option>
                <option value="PASS">PASS Only</option>
                <option value="FAIL">FAIL Only</option>
              </select>

              {/* Digital Sign Filter */}
              <select
                value={signedFilter}
                onChange={(e) => setSignedFilter(e.target.value)}
                aria-label="Filter by signature status"
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="ALL">All Status</option>
                <option value="SIGNED">Digitally Signed</option>
                <option value="UNSIGNED">Pending Sign</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort reports"
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
              </select>

              {(searchTerm || verdictFilter !== 'ALL' || signedFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setVerdictFilter('ALL');
                    setSignedFilter('ALL');
                  }}
                  className="h-8 text-xs text-slate-500 hover:text-slate-800"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              <p className="text-xs font-medium text-slate-600">Loading certificate registry...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
              <FileText className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-800">No matching certificates found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {reports.length === 0
                  ? 'No official certificates have been generated yet. Complete an evaluation session and click "Generate Official Certificate".'
                  : 'No reports match your selected search or filter criteria.'}
              </p>
              {(searchTerm || verdictFilter !== 'ALL' || signedFilter !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setVerdictFilter('ALL');
                    setSignedFilter('ALL');
                  }}
                  className="mt-4 text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-50 text-xs">
                    <TableHead className="font-bold text-slate-700">Report Number</TableHead>
                    <TableHead className="font-bold text-slate-700">Instrument & Serial</TableHead>
                    <TableHead className="font-bold text-slate-700">Manufacturer</TableHead>
                    <TableHead className="font-bold text-slate-700">Verdict</TableHead>
                    <TableHead className="font-bold text-slate-700">Digital Seal</TableHead>
                    <TableHead className="font-bold text-slate-700">Issue Date</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredReports.map((report) => {
                    const isPass = report.overall_result === 'PASS';
                    const downloadUrl = getDownloadUrl(report);

                    return (
                      <TableRow key={report.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Report Number */}
                        <TableCell className="font-mono font-bold text-slate-900">
                          <Link
                            to={`/sessions/${report.session_id}/report`}
                            className="text-[#0b2545] hover:text-sky-700 hover:underline flex items-center space-x-1"
                          >
                            <span>{report.report_number}</span>
                          </Link>
                          {report.session_number && (
                            <div className="text-[10px] text-slate-400 font-sans font-normal">
                              Session: {report.session_number}
                            </div>
                          )}
                        </TableCell>

                        {/* Instrument & Serial */}
                        <TableCell>
                          <div className="font-semibold text-slate-800">{report.instrument_model || 'XP205'}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            SN: {report.serial_number || '--'}
                            {report.accuracy_class && (
                              <span className="ml-1 text-slate-400">• Class {report.accuracy_class}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Manufacturer */}
                        <TableCell className="text-slate-700 font-medium">
                          {report.manufacturer_name || 'Standard Make'}
                        </TableCell>

                        {/* Verdict */}
                        <TableCell>
                          <Badge variant={isPass ? 'pass' : 'fail'} className="text-[10px] font-bold">
                            {report.overall_result}
                          </Badge>
                        </TableCell>

                        {/* Digital Signature */}
                        <TableCell>
                          {report.is_signed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <ShieldCheck className="mr-1 h-3 w-3 text-emerald-600" /> SEALED
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              PENDING
                            </span>
                          )}
                        </TableCell>

                        {/* Issue Date */}
                        <TableCell className="text-slate-600 font-medium">
                          {formatDate(report.generated_at)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* View Certificate */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/sessions/${report.session_id}/report`)}
                              className="h-7 px-2 text-[11px] border-slate-300 text-slate-700 hover:bg-slate-100"
                              title="View Certificate Document"
                            >
                              <Eye className="mr-1 h-3 w-3 text-sky-600" /> View
                            </Button>

                            {/* Download PDF */}
                            <a
                              href={downloadUrl}
                              download={`${report.report_number}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                size="sm"
                                className="h-7 px-2 text-[11px] bg-[#0b2545] hover:bg-[#134074] text-white"
                                title="Download PDF File"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </a>

                            {/* Verify QR */}
                            <Link
                              to={`/verify/${report.report_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] border-slate-300 text-slate-600 hover:bg-slate-100"
                                title="Open Public Verification Link"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsListPage;
