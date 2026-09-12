import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export const DiscriminationTestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, instrument, tests, refetchTests } = useOutletContext();

  const [testRecord, setTestRecord] = useState(null);
  const [baseLoad, setBaseLoad] = useState('');
  const [addedWeight, setAddedWeight] = useState('');
  const [indicatedBefore, setIndicatedBefore] = useState('');
  const [indicatedAfter, setIndicatedAfter] = useState('');
  const [displayChanged, setDisplayChanged] = useState(true);
  const [recordedReading, setRecordedReading] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Suggested values
  const dVal = Number(instrument?.actual_interval_d) || Number(instrument?.verification_interval_e) || 2;
  const suggestedAdded = (dVal * 1.4).toFixed(1); // 1.4d
  const maxCap = Number(instrument?.capacity_max) || 15000;
  const suggestedBase = Math.round(maxCap * 0.5);

  // Initialize DISCRIMINATION test on mount
  const initTest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/sessions/${id}/tests`, {
        test_type_code: 'DISCRIMINATION',
      });
      if (res.data?.success && res.data?.data?.test) {
        setTestRecord(res.data.data.test);
      }
    } catch (err) {
      console.error('Failed to initialize discrimination test:', err);
      toast.error('Failed to initialize discrimination test module');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    initTest();
  }, [initTest]);

  // Sync existing recorded readings
  useEffect(() => {
    const discTest = tests.find((t) => t.test_type_code === 'DISCRIMINATION');
    const existing = discTest?.readings?.[0];

    if (existing) {
      setRecordedReading(existing);
      setBaseLoad(existing.standard_value);
      setIndicatedAfter(existing.indicated_value);
      if (existing.extra_data) {
        const extra = existing.extra_data;
        setAddedWeight(extra.added_weight ?? '');
        setIndicatedBefore(extra.indicated_before ?? '');
        setDisplayChanged(extra.display_changed ?? true);
      }
    } else {
      if (baseLoad === '') setBaseLoad(suggestedBase);
      if (addedWeight === '') setAddedWeight(suggestedAdded);
    }
  }, [tests, suggestedBase, suggestedAdded]);

  const isFormValid =
    baseLoad !== '' &&
    addedWeight !== '' &&
    indicatedBefore !== '' &&
    indicatedAfter !== '' &&
    !isNaN(Number(baseLoad)) &&
    !isNaN(Number(addedWeight));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!testRecord?.id || !isFormValid) return;

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/sessions/${id}/tests/${testRecord.id}/readings`, {
        base_load: Number(baseLoad),
        added_weight: Number(addedWeight),
        indicated_before: Number(indicatedBefore),
        indicated_after: Number(indicatedAfter),
        display_changed: Boolean(displayChanged),
      });

      if (res.data?.success && res.data?.data?.reading) {
        const rec = res.data.data.reading;
        if (rec.result === 'FAIL') {
          toast.error('Discrimination test evaluated as FAIL. Display did not reflect added load.');
        } else {
          toast.success('Discrimination test evaluated as PASS.');
        }
        await refetchTests();
      }
    } catch (err) {
      console.error('Failed to submit discrimination test:', err);
      toast.error(err.response?.data?.message || 'Failed to submit discrimination test');
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
      toast.success('Discrimination test cleared');
      await refetchTests();
    } catch (err) {
      console.error('Failed to delete reading:', err);
      toast.error('Failed to clear discrimination reading');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HelpCircle className="h-5 w-5 text-sky-600" />
                <span>Page 7: Discrimination Test ($\Delta L = 1.4d$)</span>
              </CardTitle>
              {recordedReading && (
                <Badge variant={recordedReading.result === 'PASS' ? 'pass' : 'fail'} className="text-xs">
                  {recordedReading.result}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Verify digital indicator responsiveness when an extra small test weight ($\Delta L \ge 1.4d$) is smoothly deposited per OIML R-76 Section 3.8
            </CardDescription>
          </div>
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
                  Base Load = <strong>{recordedReading.standard_value}g</strong> &bull; Added Load ($\Delta L$) = <strong>{recordedReading.extra_data?.added_weight}g</strong> &bull; Display Changed = <strong>{recordedReading.extra_data?.display_changed ? 'YES' : 'NO'}</strong>
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteReading}
                disabled={deleting}
                className="text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-100"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />} Re-run Test
              </Button>
            </div>
          )}

          {/* Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Input 1: Base Load */}
            <div className="space-y-1.5">
              <Label htmlFor="baseLoad" className="text-xs font-semibold text-slate-700">
                Base Test Load ($L$) <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="baseLoad"
                  type="number"
                  step="any"
                  disabled={Boolean(recordedReading)}
                  placeholder={`e.g. ${suggestedBase}`}
                  value={baseLoad}
                  onChange={(e) => setBaseLoad(e.target.value)}
                  className="text-xs font-mono pr-8"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">g</span>
              </div>
            </div>

            {/* Input 2: Added Test Weight */}
            <div className="space-y-1.5">
              <Label htmlFor="addedWeight" className="text-xs font-semibold text-slate-700">
                Extra Added Weight ($\Delta L = 1.4d$) <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="addedWeight"
                  type="number"
                  step="any"
                  disabled={Boolean(recordedReading)}
                  placeholder={`e.g. ${suggestedAdded}`}
                  value={addedWeight}
                  onChange={(e) => setAddedWeight(e.target.value)}
                  className="text-xs font-mono pr-8"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">g</span>
              </div>
              <p className="text-[10px] text-slate-500">Calculated $1.4 \times d$ ($1.4 \times {dVal} = {suggestedAdded}g$)</p>
            </div>

            {/* Input 3: Indicated Value Before */}
            <div className="space-y-1.5">
              <Label htmlFor="indicatedBefore" className="text-xs font-semibold text-slate-700">
                Indicated Value Before Adding Weight ($I_1$) <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="indicatedBefore"
                  type="number"
                  step="any"
                  disabled={Boolean(recordedReading)}
                  placeholder="e.g. 7500.0"
                  value={indicatedBefore}
                  onChange={(e) => setIndicatedBefore(e.target.value)}
                  className="text-xs font-mono pr-8"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">g</span>
              </div>
            </div>

            {/* Input 4: Indicated Value After */}
            <div className="space-y-1.5">
              <Label htmlFor="indicatedAfter" className="text-xs font-semibold text-slate-700">
                Indicated Value After Adding Weight ($I_2$) <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="indicatedAfter"
                  type="number"
                  step="any"
                  disabled={Boolean(recordedReading)}
                  placeholder="e.g. 7502.8"
                  value={indicatedAfter}
                  onChange={(e) => setIndicatedAfter(e.target.value)}
                  className="text-xs font-mono pr-8"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">g</span>
              </div>
            </div>
          </div>

          {/* Input 5: Display Changed Radio Group */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <Label className="text-xs font-semibold text-slate-800">
              Did the instrument display unmistakably change value upon depositing $\Delta L$? <span className="text-rose-500">*</span>
            </Label>
            <div className="flex space-x-3 pt-1">
              <button
                type="button"
                disabled={Boolean(recordedReading)}
                onClick={() => setDisplayChanged(true)}
                className={`flex items-center space-x-2 rounded-lg border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  displayChanged
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 ${displayChanged ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>YES — Digital Reading Changed (PASS)</span>
              </button>

              <button
                type="button"
                disabled={Boolean(recordedReading)}
                onClick={() => setDisplayChanged(false)}
                className={`flex items-center space-x-2 rounded-lg border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  !displayChanged
                    ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className={`h-4 w-4 ${!displayChanged ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>NO — Display Did Not Change (FAIL)</span>
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/sessions/${id}/repeatability`)}
            className="text-xs"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Repeatability
          </Button>

          {!recordedReading ? (
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording Result...
                </>
              ) : (
                'Submit Discrimination Test'
              )}
            </Button>
          ) : (
            <Button
              onClick={() => navigate(`/sessions/${id}/summary`)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md text-xs font-semibold px-6"
            >
              <Award className="mr-2 h-4 w-4" /> Proceed to Summary & Verdict <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default DiscriminationTestPage;
