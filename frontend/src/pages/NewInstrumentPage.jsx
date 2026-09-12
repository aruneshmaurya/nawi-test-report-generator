import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Scale,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Info,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

// Client-side Zod schema aligned with backend
const instrumentFormSchema = z.object({
  verification_type: z.enum(['INITIAL', 'IN_SERVICE']),
  manufacturer_name: z.string().trim().min(2, 'Manufacturer name is required (min 2 characters)'),
  model: z.string().trim().min(1, 'Model/Type designation is required'),
  serial_number: z.string().trim().min(1, 'Serial number is required'),
  capacity_unit: z.enum(['g', 'kg', 'mg', 't']).default('g'),
  capacity_max: z.coerce.number().positive('Max capacity must be a positive number'),
  capacity_min: z.coerce.number().nonnegative('Min capacity must be non-negative').default(0),
  verification_interval_e: z.coerce.number().positive('Verification scale interval (e) must be positive'),
  actual_interval_d: z.coerce.number().positive('Actual scale interval (d) must be positive').optional().nullable(),
  accuracy_class: z.enum(['I', 'II', 'III', 'IIII'], {
    errorMap: () => ({ message: 'Please select an accuracy class' }),
  }),
  instrument_type: z.enum(['SINGLE_RANGE', 'MULTI_RANGE'], {
    errorMap: () => ({ message: 'Please select an instrument type' }),
  }),
  power_source: z.string().trim().optional().nullable(),
  manufacture_date: z.string().optional().nullable(),
});

export const NewInstrumentPage = () => {
  const navigate = useNavigate();
  const [manufacturers, setManufacturers] = useState([]);
  const [mfrLoading, setMfrLoading] = useState(false);
  const [serverWarnings, setServerWarnings] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(instrumentFormSchema),
    defaultValues: {
      verification_type: 'INITIAL',
      manufacturer_name: '',
      model: '',
      serial_number: '',
      capacity_unit: 'g',
      capacity_max: '',
      capacity_min: '0',
      verification_interval_e: '',
      actual_interval_d: '',
      accuracy_class: 'III',
      instrument_type: 'SINGLE_RANGE',
      power_source: 'Mains 230V AC',
      manufacture_date: new Date().toISOString().split('T')[0],
    },
  });

  // Watch values for live n = Max/e calculation
  const watchedMax = watch('capacity_max');
  const watchedE = watch('verification_interval_e');
  const watchedClass = watch('accuracy_class');
  const watchedVerificationType = watch('verification_type');

  // Compute verification intervals live: n = Max / e
  const computedN = useMemo(() => {
    const maxVal = parseFloat(watchedMax);
    const eVal = parseFloat(watchedE);
    if (!isNaN(maxVal) && !isNaN(eVal) && eVal > 0) {
      return Math.round(maxVal / eVal);
    }
    return null;
  }, [watchedMax, watchedE]);

  // Live client-side plausibility indicator
  const clientPlausibilityWarning = useMemo(() => {
    if (!computedN || !watchedClass) return null;
    if (watchedClass === 'I' && computedN < 50000) {
      return `Class I typically requires n ≥ 50,000 (currently n = ${computedN.toLocaleString()})`;
    }
    if (watchedClass === 'II' && (computedN < 100 || computedN > 100000)) {
      return `Class II typically requires 100 ≤ n ≤ 100,000 (currently n = ${computedN.toLocaleString()})`;
    }
    if (watchedClass === 'III' && (computedN < 100 || computedN > 10000)) {
      return `Class III typically requires 100 ≤ n ≤ 10,000 (currently n = ${computedN.toLocaleString()})`;
    }
    if (watchedClass === 'IIII' && (computedN < 100 || computedN > 1000)) {
      return `Class IIII typically requires 100 ≤ n ≤ 1,000 (currently n = ${computedN.toLocaleString()})`;
    }
    return null;
  }, [computedN, watchedClass]);

  // Load manufacturers for autocomplete dropdown
  useEffect(() => {
    const loadManufacturers = async () => {
      setMfrLoading(true);
      try {
        const res = await apiClient.get('/manufacturers');
        if (res.data?.success && res.data?.data?.manufacturers) {
          setManufacturers(res.data.data.manufacturers);
        }
      } catch (err) {
        console.error('Failed to load manufacturers list:', err);
      } finally {
        setMfrLoading(false);
      }
    };
    loadManufacturers();
  }, []);

  const onSubmit = async (data) => {
    setServerWarnings([]);
    setSubmitting(true);

    try {
      // 1. Create Instrument
      const instPayload = {
        manufacturer_name: data.manufacturer_name.trim(),
        model: data.model.trim(),
        serial_number: data.serial_number.trim(),
        capacity_max: Number(data.capacity_max),
        capacity_min: Number(data.capacity_min) || 0,
        verification_interval_e: Number(data.verification_interval_e),
        actual_interval_d: data.actual_interval_d ? Number(data.actual_interval_d) : Number(data.verification_interval_e),
        accuracy_class: data.accuracy_class,
        instrument_type: data.instrument_type,
        power_source: data.power_source,
        manufacture_date: data.manufacture_date || null,
      };

      const instRes = await apiClient.post('/instruments', instPayload);

      if (!instRes.data?.success || !instRes.data?.data?.instrument?.id) {
        throw new Error(instRes.data?.message || 'Failed to create instrument');
      }

      const createdInstrument = instRes.data.data.instrument;
      const warnings = instRes.data.data.warnings || [];

      if (warnings.length > 0) {
        setServerWarnings(warnings);
        toast.warning('Instrument saved with metrological plausibility notes.');
      } else {
        toast.success('Instrument registered successfully.');
      }

      // 2. Automatically create new Test Session for this instrument
      const sessionRes = await apiClient.post('/sessions', {
        instrument_id: createdInstrument.id,
        verification_type: data.verification_type,
      });

      if (sessionRes.data?.success && sessionRes.data?.data?.session?.id) {
        const newSession = sessionRes.data.data.session;
        toast.success(`Test Session ${newSession.session_number} initialized!`);
        // Navigate to Step 1: Test Conditions
        navigate(`/sessions/${newSession.id}/conditions`);
      } else {
        throw new Error(sessionRes.data?.message || 'Failed to initialize test session');
      }
    } catch (err) {
      console.error('Instrument submission failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to register instrument';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header & Back Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="border-slate-300"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Page 2: Instrument Details
            </h1>
            <p className="text-xs text-slate-500">
              OIML R-76-1:2006 Non-Automatic Weighing Instrument Specification
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Verification Type Toggle Banner */}
        <Card className="border-sky-200 bg-gradient-to-r from-sky-50/70 to-blue-50/70 shadow-sm">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-900">
                Verification Scheme
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Select whether this instrument is undergoing initial factory verification or subsequent in-service inspection.
              </p>
            </div>

            <Controller
              control={control}
              name="verification_type"
              render={({ field }) => (
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => field.onChange('INITIAL')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      field.value === 'INITIAL'
                        ? 'bg-[#0b2545] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    INITIAL VERIFICATION
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('IN_SERVICE')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      field.value === 'IN_SERVICE'
                        ? 'bg-[#0b2545] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    IN-SERVICE INSPECTION
                  </button>
                </div>
              )}
            />
          </CardContent>
        </Card>

        {/* Non-blocking Warnings Banner */}
        {(serverWarnings.length > 0 || clientPlausibilityWarning) && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1.5 animate-in fade-in">
            <div className="flex items-center space-x-2 font-bold text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Metrological Plausibility Notice (Non-Blocking)</span>
            </div>
            {clientPlausibilityWarning && (
              <p className="pl-6 text-amber-700">{clientPlausibilityWarning}</p>
            )}
            {serverWarnings.map((w, i) => (
              <p key={i} className="pl-6 text-amber-700">&bull; {w}</p>
            ))}
          </div>
        )}

        {/* Instrument Details Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Scale className="h-4 w-4 text-sky-600" />
              <span>Instrument Identification & Metrological Parameters</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              All parameters are recorded onto the official OIML test certificate
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Row 1: Manufacturer Name & Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: Manufacturer Name */}
              <div className="space-y-1.5">
                <Label htmlFor="manufacturer_name" className="text-xs font-semibold text-slate-700">
                  Manufacturer Name <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="manufacturer_name"
                    list="manufacturers-datalist"
                    placeholder="e.g. Mettler Toledo, Sartorius, Avery"
                    className="text-xs"
                    {...register('manufacturer_name')}
                  />
                  <datalist id="manufacturers-datalist">
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.name} />
                    ))}
                  </datalist>
                </div>
                {errors.manufacturer_name && (
                  <p className="text-[11px] text-rose-600">{errors.manufacturer_name.message}</p>
                )}
              </div>

              {/* Field 2: Model / Type Designation */}
              <div className="space-y-1.5">
                <Label htmlFor="model" className="text-xs font-semibold text-slate-700">
                  Model / Type Designation <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="model"
                  placeholder="e.g. XP205 Precision Balance"
                  className="text-xs"
                  {...register('model')}
                />
                {errors.model && (
                  <p className="text-[11px] text-rose-600">{errors.model.message}</p>
                )}
              </div>
            </div>

            {/* Row 2: Serial Number & Accuracy Class */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 3: Serial Number */}
              <div className="space-y-1.5">
                <Label htmlFor="serial_number" className="text-xs font-semibold text-slate-700">
                  Serial Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="serial_number"
                  placeholder="e.g. SN-2026-X88910"
                  className="font-mono text-xs"
                  {...register('serial_number')}
                />
                {errors.serial_number && (
                  <p className="text-[11px] text-rose-600">{errors.serial_number.message}</p>
                )}
              </div>

              {/* Field 8: Accuracy Class */}
              <div className="space-y-1.5">
                <Label htmlFor="accuracy_class" className="text-xs font-semibold text-slate-700">
                  Accuracy Class (OIML) <span className="text-rose-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="accuracy_class"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="accuracy_class" className="text-xs font-medium">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="I" className="text-xs">Class I (Special Precision)</SelectItem>
                        <SelectItem value="II" className="text-xs">Class II (High Precision)</SelectItem>
                        <SelectItem value="III" className="text-xs">Class III (Medium / Commercial)</SelectItem>
                        <SelectItem value="IIII" className="text-xs">Class IIII (Ordinary)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.accuracy_class && (
                  <p className="text-[11px] text-rose-600">{errors.accuracy_class.message}</p>
                )}
              </div>
            </div>

            {/* Row 3: Max Capacity & Min Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Field 4: Max Capacity + Unit */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="capacity_max" className="text-xs font-semibold text-slate-700">
                  Maximum Capacity (Max) <span className="text-rose-500">*</span>
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="capacity_max"
                    type="number"
                    step="any"
                    placeholder="e.g. 15000"
                    className="text-xs flex-1"
                    {...register('capacity_max')}
                  />
                  <Controller
                    control={control}
                    name="capacity_unit"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-20 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="t">ton</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {errors.capacity_max && (
                  <p className="text-[11px] text-rose-600">{errors.capacity_max.message}</p>
                )}
              </div>

              {/* Field 5: Min Capacity */}
              <div className="space-y-1.5">
                <Label htmlFor="capacity_min" className="text-xs font-semibold text-slate-700">
                  Minimum Capacity (Min)
                </Label>
                <Input
                  id="capacity_min"
                  type="number"
                  step="any"
                  placeholder="e.g. 20"
                  className="text-xs"
                  {...register('capacity_min')}
                />
              </div>
            </div>

            {/* Row 4: Intervals e, d, and Live Computed n */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              {/* Field 6: Verification Scale Interval (e) */}
              <div className="space-y-1.5">
                <Label htmlFor="verification_interval_e" className="text-xs font-semibold text-slate-700">
                  Verification Interval (e) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="verification_interval_e"
                  type="number"
                  step="any"
                  placeholder="e.g. 2"
                  className="text-xs bg-white"
                  {...register('verification_interval_e')}
                />
                {errors.verification_interval_e && (
                  <p className="text-[11px] text-rose-600">{errors.verification_interval_e.message}</p>
                )}
              </div>

              {/* Field 7: Actual Scale Interval (d) */}
              <div className="space-y-1.5">
                <Label htmlFor="actual_interval_d" className="text-xs font-semibold text-slate-700">
                  Actual Interval (d)
                </Label>
                <Input
                  id="actual_interval_d"
                  type="number"
                  step="any"
                  placeholder="e.g. 0.5 (optional)"
                  className="text-xs bg-white"
                  {...register('actual_interval_d')}
                />
              </div>

              {/* Field 9: Live Computed No. of Verification Intervals (n = Max/e) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sky-900 flex items-center justify-between">
                  <span>Intervals (n = Max/e)</span>
                  <span className="text-[10px] text-sky-600 font-normal">Live Auto-Calculated</span>
                </Label>
                <div className="flex h-9 items-center justify-between rounded-md border border-sky-300 bg-sky-50/80 px-3 font-mono text-sm font-bold text-sky-950 shadow-inner">
                  <span>{computedN !== null ? computedN.toLocaleString() : '--'}</span>
                  <span className="text-[10px] text-sky-700 font-sans font-medium">divisions</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Formula: Max / e ({watchedMax || 0} / {watchedE || 0})
                </p>
              </div>
            </div>

            {/* Row 5: Instrument Type, Power Source, Date of Manufacture */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Field 10: Instrument Type */}
              <div className="space-y-1.5">
                <Label htmlFor="instrument_type" className="text-xs font-semibold text-slate-700">
                  Instrument Type <span className="text-rose-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="instrument_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="instrument_type" className="text-xs font-medium">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE_RANGE" className="text-xs">Single Range</SelectItem>
                        <SelectItem value="MULTI_RANGE" className="text-xs">Multi-Range / Interval</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Field 11: Power Source */}
              <div className="space-y-1.5">
                <Label htmlFor="power_source" className="text-xs font-semibold text-slate-700">
                  Power Source
                </Label>
                <Controller
                  control={control}
                  name="power_source"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="power_source" className="text-xs font-medium">
                        <SelectValue placeholder="Select Power Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mains 230V AC" className="text-xs">Mains 230V AC (50Hz)</SelectItem>
                        <SelectItem value="Battery DC" className="text-xs">Battery Powered (DC)</SelectItem>
                        <SelectItem value="Mains + Battery Internal" className="text-xs">Mains + Internal Backup</SelectItem>
                        <SelectItem value="USB 5V DC" className="text-xs">USB / External Low Voltage</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Field 12: Date of Manufacture */}
              <div className="space-y-1.5">
                <Label htmlFor="manufacture_date" className="text-xs font-semibold text-slate-700">
                  Date of Manufacture
                </Label>
                <Input
                  id="manufacture_date"
                  type="date"
                  className="text-xs"
                  {...register('manufacture_date')}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving & Initializing Session...
                </>
              ) : (
                <>
                  Save & Proceed to Test Conditions <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default NewInstrumentPage;
