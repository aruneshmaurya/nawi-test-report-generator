import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Outlet, Link } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Scale,
  Thermometer,
  Target,
  LayoutGrid,
  RotateCcw,
  HelpCircle,
  Award,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

export const WIZARD_STEPS = [
  { key: 'conditions', label: 'Conditions', pathSuffix: 'conditions', icon: Thermometer },
  { key: 'accuracy', label: 'Accuracy', pathSuffix: 'accuracy', icon: Target },
  { key: 'eccentricity', label: 'Eccentricity', pathSuffix: 'eccentricity', icon: LayoutGrid },
  { key: 'repeatability', label: 'Repeatability', pathSuffix: 'repeatability', icon: RotateCcw },
  { key: 'discrimination', label: 'Discrimination', pathSuffix: 'discrimination', icon: HelpCircle },
  { key: 'summary', label: 'Summary', pathSuffix: 'summary', icon: Award },
  { key: 'report', label: 'Certificate', pathSuffix: 'report', icon: FileText },
];

export const SessionWizardLayout = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch full session details
  const fetchSession = useCallback(async () => {
    try {
      const res = await apiClient.get(`/sessions/${id}`);
      if (res.data?.success && res.data?.data?.session) {
        setSession(res.data.data.session);
        return res.data.data.session;
      }
      throw new Error(res.data?.message || 'Session not found');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load test session');
      return null;
    }
  }, [id]);

  // Fetch all tests and readings for this session
  const fetchTests = useCallback(async () => {
    try {
      const res = await apiClient.get(`/sessions/${id}/tests`);
      if (res.data?.success && res.data?.data?.tests) {
        setTests(res.data.data.tests);
        return res.data.data.tests;
      }
      return [];
    } catch (err) {
      console.warn('Failed to load session tests:', err);
      return [];
    }
  }, [id]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSession(), fetchTests()]);
    setLoading(false);
  }, [fetchSession, fetchTests]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Determine which step is currently active
  const currentPathSegment = location.pathname.split('/').pop();
  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.pathSuffix === currentPathSegment);

  // Helper to check test completion
  const getTestByCode = (code) => tests.find((t) => t.test_type_code === code);
  const hasReadings = (code) => {
    const t = getTestByCode(code);
    return t && t.readings && t.readings.length > 0;
  };

  // Check step accessibility and prevent skipping ahead
  useEffect(() => {
    if (loading || !session) return;

    // If session is already completed or approved, only block the Certificate tab if no PDF report is generated yet
    if (session.status === 'COMPLETED' || session.status === 'APPROVED') {
      if (currentStepIndex === 6 && (!session.report?.pdf_url || session.report?.overall_result === 'PENDING')) {
        toast.warning('Please generate the official PDF certificate first from the Summary page.');
        navigate(`/sessions/${id}/summary`, { replace: true });
      }
      return;
    }

    // Conditions (index 0) is always accessible
    if (currentStepIndex <= 0) return;

    // Accuracy (index 1) requires session to exist
    if (currentStepIndex === 1) return;

    // Eccentricity (index 2) requires Accuracy readings
    if (currentStepIndex === 2 && !hasReadings('ACCURACY')) {
      toast.warning('Please enter accuracy test readings before proceeding to eccentricity.');
      navigate(`/sessions/${id}/accuracy`, { replace: true });
      return;
    }

    // Repeatability (index 3) requires Accuracy & Eccentricity readings
    if (currentStepIndex === 3) {
      if (!hasReadings('ACCURACY')) {
        toast.warning('Please complete accuracy test first.');
        navigate(`/sessions/${id}/accuracy`, { replace: true });
        return;
      }
      if (!hasReadings('ECCENTRICITY')) {
        toast.warning('Please complete eccentricity test readings first.');
        navigate(`/sessions/${id}/eccentricity`, { replace: true });
        return;
      }
    }

    // Discrimination (index 4) requires Accuracy, Eccentricity, and Repeatability
    if (currentStepIndex === 4) {
      if (!hasReadings('REPEATABILITY')) {
        toast.warning('Please complete repeatability test first.');
        navigate(`/sessions/${id}/repeatability`, { replace: true });
        return;
      }
    }

    // Summary (index 5) requires all four tests
    if (currentStepIndex === 5) {
      if (
        !hasReadings('ACCURACY') ||
        !hasReadings('ECCENTRICITY') ||
        !hasReadings('REPEATABILITY') ||
        !hasReadings('DISCRIMINATION')
      ) {
        toast.warning('Please record all four test modules before viewing final summary.');
        navigate(`/sessions/${id}/conditions`, { replace: true });
        return;
      }
    }

    // Certificate (index 6) requires generated PDF report
    if (currentStepIndex === 6) {
      if (
        !hasReadings('ACCURACY') ||
        !hasReadings('ECCENTRICITY') ||
        !hasReadings('REPEATABILITY') ||
        !hasReadings('DISCRIMINATION')
      ) {
        toast.warning('Please record all four test modules before viewing certificate.');
        navigate(`/sessions/${id}/conditions`, { replace: true });
        return;
      }
      if (!session.report?.pdf_url || session.report?.overall_result === 'PENDING') {
        toast.warning('Please generate the official PDF certificate first from the Summary page.');
        navigate(`/sessions/${id}/summary`, { replace: true });
      }
    }
  }, [currentStepIndex, tests, session, loading, id, navigate]);

  if (loading) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        <p className="text-sm font-medium text-slate-600">Loading test session context...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Session Error</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">{error || 'Unable to find specified test session.'}</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-[#0b2545] hover:bg-[#134074]">
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  const instrument = session.instrument || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* 1. Session Information Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info: Session Number & Instrument */}
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b2545] text-sky-400 shadow-md">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-bold text-slate-900">
                  {session.session_number}
                </span>
                <Badge variant={session.verification_type === 'INITIAL' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                  {session.verification_type === 'INITIAL' ? 'INITIAL VERIFICATION' : 'IN-SERVICE'}
                </Badge>
                <Badge variant={session.status === 'COMPLETED' ? 'secondary' : session.status === 'APPROVED' ? 'approved' : 'progress'} className="text-[10px]">
                  {session.status}
                </Badge>
              </div>

              <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-slate-800">
                  {instrument.model || 'Non-Automatic Weighing Balance'}
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="font-mono text-slate-600">SN: {instrument.serial_number || '--'}</span>
                <span className="text-slate-400">&bull;</span>
                <span>Class {instrument.accuracy_class || 'III'}</span>
                <span className="text-slate-400">&bull;</span>
                <span>Max {instrument.capacity_max ? `${instrument.capacity_max}g` : '--'}</span>
                <span className="text-slate-400">&bull;</span>
                <span>e = {instrument.verification_interval_e ? `${instrument.verification_interval_e}g` : '--'}</span>
              </div>
            </div>
          </div>

          {/* Right info: Quick Navigation / Facility */}
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-xs h-8 border-slate-300"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Wizard Step Navigation Bar */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-[700px] items-center justify-between">
          {WIZARD_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStepIndex === idx;
            const isCompletedSession = session.status === 'COMPLETED' || session.status === 'APPROVED';
            const hasValidReport = Boolean(session.report?.pdf_url && session.report?.overall_result !== 'PENDING');

            const isCompleted =
              (step.key === 'conditions' && (isCompletedSession || session.environment)) ||
              (step.key === 'accuracy' && (isCompletedSession || hasReadings('ACCURACY'))) ||
              (step.key === 'eccentricity' && (isCompletedSession || hasReadings('ECCENTRICITY'))) ||
              (step.key === 'repeatability' && (isCompletedSession || hasReadings('REPEATABILITY'))) ||
              (step.key === 'discrimination' && (isCompletedSession || hasReadings('DISCRIMINATION'))) ||
              (step.key === 'summary' && isCompletedSession) ||
              (step.key === 'report' && hasValidReport);

            const isAccessible =
              idx === 0 ||
              (idx === 1 && (isCompletedSession || true)) ||
              (idx === 2 && (isCompletedSession || hasReadings('ACCURACY'))) ||
              (idx === 3 && (isCompletedSession || (hasReadings('ACCURACY') && hasReadings('ECCENTRICITY')))) ||
              (idx === 4 && (isCompletedSession || hasReadings('REPEATABILITY'))) ||
              (idx === 5 && (isCompletedSession || hasReadings('DISCRIMINATION'))) ||
              (idx === 6 && hasValidReport);

            return (
              <React.Fragment key={step.key}>
                <Link
                  to={`/sessions/${id}/${step.pathSuffix}`}
                  onClick={(e) => {
                    if (!isAccessible) {
                      e.preventDefault();
                      if (idx === 6) {
                        toast.warning('Please generate the official PDF certificate first from the Summary page.');
                      } else {
                        toast.warning('Please complete previous test steps first.');
                      }
                    }
                  }}
                  className={`flex flex-1 items-center justify-center space-x-2 rounded-lg py-2.5 px-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#0b2545] text-white shadow-md'
                      : isCompleted
                      ? 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/60'
                      : isAccessible
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]">
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="truncate">{step.label}</span>
                </Link>

                {idx < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 mx-1" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. Render Active Step Content */}
      <Outlet
        context={{
          session,
          instrument,
          tests,
          refetchSession: fetchSession,
          refetchTests: fetchTests,
          refreshAll,
        }}
      />
    </div>
  );
};

export default SessionWizardLayout;
