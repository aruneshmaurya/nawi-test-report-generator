import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Award,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Target,
  LayoutGrid,
  RotateCcw,
  HelpCircle,
  Thermometer,
  Save,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';

export const SummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { session, instrument, refetchSession } = context;

  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);

  const [remarks, setRemarks] = useState('');
  const [reviewerName, setReviewerName] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/sessions/${id}/summary`);
      if (res.data?.success && res.data?.data?.summary) {
        const sum = res.data.data.summary;
        setSummaryData(sum);
        setRemarks(sum.session?.remarks || sum.reason_string || '');
        setReviewerName(sum.session?.reviewer_name || '');
      }
    } catch (err) {
      console.error('Failed to load session summary:', err);
      toast.error('Failed to load test summary');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSaveRemarks = async (e) => {
    if (e) e.preventDefault();
    setSavingRemarks(true);
    try {
      const res = await apiClient.patch(`/sessions/${id}/remarks`, {
        remarks,
        reviewer_name: reviewerName,
      });
      if (res.data?.success) {
        toast.success('Remarks and reviewer information saved');
        if (typeof refetchSession === 'function') {
          await refetchSession();
        }
      }
    } catch (err) {
      console.error('Failed to save remarks:', err);
      toast.error(err.response?.data?.message || 'Failed to save remarks');
    } finally {
      setSavingRemarks(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      // 1. Save remarks first
      await apiClient.patch(`/sessions/${id}/remarks`, {
        remarks,
        reviewer_name: reviewerName,
      });

      // 2. Call PDF generation endpoint (Puppeteer + QR Code + Supabase Storage upload)
      const res = await apiClient.post(`/sessions/${id}/reports`);
      if (res.data?.success) {
        toast.success('Official OIML Test Certificate PDF generated successfully!');
        if (typeof refetchSession === 'function') {
          await refetchSession();
        }
        navigate(`/sessions/${id}/report`);
      }
    } catch (err) {
      console.error('PDF Generation failed:', err);
      toast.error(err.response?.data?.message || 'Failed to generate PDF certificate');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        <p className="text-sm font-medium text-slate-600">Aggregating OIML R-76 test modules...</p>
      </div>
    );
  }

  const overallPass = summaryData?.overall_result === 'PASS';
  const tests = summaryData?.tests || {};
  const accuracy = tests.ACCURACY || {};
  const eccentricity = tests.ECCENTRICITY || {};
  const repeatability = tests.REPEATABILITY || {};
  const discrimination = tests.DISCRIMINATION || {};

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/sessions/${id}/discrimination`)}
          className="text-xs border-slate-300 w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Discrimination
        </Button>

        <Button
          onClick={handleGeneratePdf}
          disabled={generatingPdf}
          className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-5"
        >
          {generatingPdf ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF & QR Code...
            </>
          ) : (
            <>
              Generate Official PDF Certificate <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* 1. Overall Compliance Verdict Banner */}
      <Card
        className={`border-2 shadow-sm ${
          overallPass
            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950'
            : 'border-rose-500 bg-rose-50/40 text-rose-950'
        }`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md ${
                  overallPass ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                {overallPass ? <CheckCircle2 className="h-7 w-7" /> : <AlertCircle className="h-7 w-7" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-extrabold tracking-tight">
                    {overallPass ? 'OVERALL VERDICT: PASS' : 'OVERALL VERDICT: FAIL'}
                  </span>
                  <Badge variant={overallPass ? 'pass' : 'fail'} className="text-xs uppercase font-bold">
                    {overallPass ? 'COMPLIES WITH OIML R-76' : 'NON-COMPLIANT'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 font-medium max-w-2xl">
                  {summaryData?.reason_string ||
                    (overallPass
                      ? 'The instrument satisfies all maximum permissible error (MPE) tolerances across all four evaluation modules.'
                      : 'One or more test parameters exceeded the allowable MPE tolerances.')}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                Verification Standard
              </span>
              <span className="text-xs font-semibold text-slate-800">
                OIML R-76-1:2006 (Class {instrument?.accuracy_class || 'III'})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Grid of 4 Test Module Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module 1: Accuracy Test */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-sky-600" />
              <CardTitle className="text-sm font-bold text-slate-900">1. Accuracy of Indication</CardTitle>
            </div>
            <Badge variant={accuracy.result === 'PASS' ? 'pass' : 'fail'} className="text-[10px]">
              {accuracy.result || 'PENDING'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Readings Recorded</span>
              <span className="font-semibold text-slate-800">{accuracy.readings_count || 0} load points</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Evaluation Mode</span>
              <span className="font-semibold text-slate-800">Ascending & Descending MPE Bounds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Module Status</span>
              <span
                className={`font-bold ${
                  accuracy.result === 'PASS' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {accuracy.result === 'PASS' ? 'All errors within ±MPE' : 'Exceeded MPE limits'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Module 2: Eccentricity Test */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <LayoutGrid className="h-4 w-4 text-sky-600" />
              <CardTitle className="text-sm font-bold text-slate-900">2. Eccentricity (Corner Load)</CardTitle>
            </div>
            <Badge variant={eccentricity.result === 'PASS' ? 'pass' : 'fail'} className="text-[10px]">
              {eccentricity.result || 'PENDING'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Positions Evaluated</span>
              <span className="font-semibold text-slate-800">{eccentricity.readings_count || 0} of 5 positions</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Test Load</span>
              <span className="font-semibold text-slate-800">~1/3 Max Capacity</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Module Status</span>
              <span
                className={`font-bold ${
                  eccentricity.result === 'PASS' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {eccentricity.result === 'PASS' ? 'Receptor uniform across all corners' : 'Failing corner error detected'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Module 3: Repeatability Test */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-sky-600" />
              <CardTitle className="text-sm font-bold text-slate-900">3. Repeatability Test</CardTitle>
            </div>
            <Badge variant={repeatability.result === 'PASS' ? 'pass' : 'fail'} className="text-[10px]">
              {repeatability.result || 'PENDING'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Consecutive Runs</span>
              <span className="font-semibold text-slate-800">3+ Trials at constant load</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Evaluation Criteria</span>
              <span className="font-semibold text-slate-800">Max Spread (Δ = Max - Min) ≤ MPE</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Module Status</span>
              <span
                className={`font-bold ${
                  repeatability.result === 'PASS' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {repeatability.result === 'PASS' ? 'Spread within permissible limit' : 'Spread exceeds MPE'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Module 4: Discrimination Test */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4 text-sky-600" />
              <CardTitle className="text-sm font-bold text-slate-900">4. Discrimination Test</CardTitle>
            </div>
            <Badge variant={discrimination.result === 'PASS' ? 'pass' : 'fail'} className="text-[10px]">
              {discrimination.result || 'PENDING'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Extra Added Load</span>
              <span className="font-semibold text-slate-800">ΔL ≥ 1.4d</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Display Indicator Response</span>
              <span className="font-semibold text-slate-800">Unmistakable digit change</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Module Status</span>
              <span
                className={`font-bold ${
                  discrimination.result === 'PASS' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {discrimination.result === 'PASS' ? 'Indicator responsive' : 'Indicator unresponsive'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Remarks & Sign-off Capture Form */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            <span>Official Tester Remarks & Sign-Off Endorsement</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            These remarks and authorized reviewer name will be permanently embedded in the generated certificate PDF.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700">
              Technical Remarks / Observations
            </Label>
            <textarea
              id="remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Instrument verified under controlled ambient conditions. Complies with OIML R-76 tolerances."
              className="w-full rounded-md border border-slate-300 p-2.5 text-xs font-sans focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="reviewerName" className="text-xs font-semibold text-slate-700">
                Reviewing Officer / Lab Head Name
              </Label>
              <Input
                id="reviewerName"
                type="text"
                placeholder="e.g. Dr. A. K. Sharma, Director Metrology"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveRemarks}
                disabled={savingRemarks}
                className="text-xs border-slate-300 w-full sm:w-auto"
              >
                {savingRemarks ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save Remarks
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/sessions/${id}/discrimination`)}
            className="text-xs"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Discrimination
          </Button>

          <Button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-6"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Certificate...
              </>
            ) : (
              <>
                Generate Official PDF Certificate <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SummaryPage;
