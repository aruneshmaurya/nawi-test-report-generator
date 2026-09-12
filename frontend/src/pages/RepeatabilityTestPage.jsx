import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  RotateCcw,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const parseExtraData = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
};

export const RepeatabilityTestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { session, instrument, tests = [], refetchTests } = context;

  const [testRecord, setTestRecord] = useState(null);
  const [loadValue, setLoadValue] = useState('');
  const [trials, setTrials] = useState(['', '', '']); // Minimum 3 trials
  const [recordedReading, setRecordedReading] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Suggested test load (~50% Max or Max)
  const maxCap = Number(instrument?.capacity_max) || 15000;
  const suggestedLoad = Math.round(maxCap * 0.5);

  // Initialize REPEATABILITY test on mount
  const initTest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/sessions/${id}/tests`, {
        test_type_code: 'REPEATABILITY',
      });
      if (res.data?.success && res.data?.data?.test) {
        setTestRecord(res.data.data.test);
      }
    } catch (err) {
      console.error('Failed to initialize repeatability test:', err);
      toast.error('Failed to initialize repeatability test module');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    initTest();
  }, [initTest]);

  // Sync existing recorded readings
  useEffect(() => {
    if (!Array.isArray(tests)) return;
    const repTest = tests.find((t) => t.test_type_code === 'REPEATABILITY');
    const existing = repTest?.readings?.[0];

    if (existing) {
      setRecordedReading(existing);
      setLoadValue(existing.standard_value ?? suggestedLoad);
      const extra = parseExtraData(existing.extra_data);
      if (Array.isArray(extra?.indicated_values) && extra.indicated_values.length > 0) {
        setTrials(extra.indicated_values.map(String));
      }
    } else {
      setRecordedReading(null);
      if (loadValue === '') {
        setLoadValue(suggestedLoad);
      }
    }
  }, [tests, suggestedLoad]);

  const handleAddTrial = () => {
    setTrials((prev) => [...(Array.isArray(prev) ? prev : ['', '', '']), '']);
  };

  const handleRemoveTrial = (idx) => {
    if ((trials || []).length <= 3) {
      toast.warning('OIML R-76 requires a minimum of 3 repeatability trials');
      return;
    }
    setTrials((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : ['', '', '']));
  };

  const handleUpdateTrial = (idx, val) => {
    setTrials((prev) => {
      const updated = Array.isArray(prev) ? [...prev] : ['', '', ''];
      updated[idx] = val;
      return updated;
    });
  };

  // Count filled valid numbers
  const filledTrialsCount = useMemo(() => {
    return (Array.isArray(trials) ? trials : []).filter((t) => t !== '' && !isNaN(Number(t))).length;
  }, [trials]);

  const isFormValid = filledTrialsCount >= 3 && loadValue !== '' && !isNaN(Number(loadValue));

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!testRecord?.id || !isFormValid) return;

    setSubmitting(true);
    try {
      const indicatedNumbers = (Array.isArray(trials) ? trials : [])
        .filter((t) => t !== '' && !isNaN(Number(t)))
        .map(Number);

      const res = await apiClient.post(`/sessions/${id}/tests/${testRecord.id}/readings`, {
        load_value: Number(loadValue),
        indicated_values: indicatedNumbers,
      });

      if (res.data?.success && res.data?.data?.reading) {
        const rec = res.data.data.reading;
        if (rec.result === 'FAIL') {
          toast.error(`Repeatability FAIL: Spread ${rec.error}g > MPE ${rec.mpe}g`);
        } else {
          toast.success(`Repeatability PASS: Spread ${rec.error}g ≤ MPE ${rec.mpe}g`);
        }
        if (typeof refetchTests === 'function') {
          await refetchTests();
        }
      }
    } catch (err) {
      console.error('Failed to submit repeatability test:', err);
      toast.error(err.response?.data?.message || 'Failed to submit repeatability test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReading = async () => {
    if (!recordedReading?.id || !testRecord?.id) return;
    setDeleting(true);

    try {
      await apiClient.delete(`/sessions/${id}/tests/${testRecord.id}/readings/${recordedReading.id}`);
      setRecordedReading(null);
      setTrials(['', '', '']);
      toast.success('Repeatability trials cleared');
      if (typeof refetchTests === 'function') {
        await refetchTests();
      }
    } catch (err) {
      console.error('Failed to delete reading:', err);
      toast.error('Failed to clear repeatability reading');
    } finally {
      setDeleting(false);
    }
  };

  const safeTrials = Array.isArray(trials) ? trials : ['', '', ''];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <RotateCcw className="h-5 w-5 text-sky-600" />
                <span>Page 6: Repeatability Test</span>
              </CardTitle>
              {recordedReading && (
                <Badge variant={recordedReading.result === 'PASS' ? 'pass' : 'fail'} className="text-xs">
                  {recordedReading.result} (SPREAD: {recordedReading.error}g)
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Verify consistency of results for the same load applied at least 3 consecutive times per OIML R-76 Section 3.6.1
            </CardDescription>
          </div>

          {!recordedReading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTrial}
              className="text-xs mt-2 sm:mt-0 border-slate-300"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Trial
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Result Banner if already recorded */}
          {recordedReading && (
            <div
              className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                recordedReading.result === 'FAIL'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  {recordedReading.result === 'FAIL' ? (
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>Evaluated Result: {recordedReading.result}</span>
                </div>
                <p className="text-xs opacity-90">
                  Spread (Δ = Max - Min) = <strong>{recordedReading.error}g</strong> &bull; Permissible MPE = <strong>±{recordedReading.mpe}g</strong>
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteReading}
                disabled={deleting}
                className="text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-100"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />} Re-run Trials
              </Button>
            </div>
          )}

          {/* Test Load Input */}
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="loadValue" className="text-xs font-semibold text-slate-700">
              Standard Test Load (L) <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="loadValue"
                type="number"
                step="any"
                disabled={Boolean(recordedReading)}
                placeholder={`e.g. ${suggestedLoad}`}
                value={loadValue}
                onChange={(e) => setLoadValue(e.target.value)}
                className="text-xs font-mono pr-8"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-sans">g</span>
            </div>
            <p className="text-[10px] text-slate-500">Recommended: ~50% Max ({suggestedLoad}g) or Max Capacity</p>
          </div>

          {/* Trial Readings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800">
                Consecutive Indicated Readings ({safeTrials.length} Trials)
              </Label>
              <span className="text-xs font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                {filledTrialsCount} of 3 minimum trials entered
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {safeTrials.map((trialVal, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">Trial #{idx + 1}</span>
                    {safeTrials.length > 3 && !recordedReading && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTrial(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      disabled={Boolean(recordedReading)}
                      placeholder={`Indicated value ${idx + 1}`}
                      value={trialVal}
                      onChange={(e) => handleUpdateTrial(idx, e.target.value)}
                      className="h-8 text-xs font-mono bg-white pr-8"
                    />
                    <span className="absolute right-3 top-1.5 text-xs text-slate-400">g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/sessions/${id}/eccentricity`)}
            className="text-xs"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Eccentricity
          </Button>

          {!recordedReading ? (
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating Spread...
                </>
              ) : (
                'Submit Repeatability Test'
              )}
            </Button>
          ) : (
            <Button
              onClick={() => navigate(`/sessions/${id}/discrimination`)}
              className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-6"
            >
              Next: Discrimination Test <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default RepeatabilityTestPage;
