import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Thermometer,
  CloudRain,
  Gauge,
  Zap,
  Scale,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const TestConditionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, instrument, refetchSession, refreshAll } = useOutletContext();

  // Environmental inputs state
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [atmosphericPressure, setAtmosphericPressure] = useState('');
  const [supplyVoltage, setSupplyVoltage] = useState('230.0');
  const [frequency, setFrequency] = useState('50.0');

  // Verification Scheme
  const [verificationType, setVerificationType] = useState('INITIAL');

  // Reference Standard Weights list
  const [referenceWeights, setReferenceWeights] = useState([
    {
      nominal_value: '',
      weight_class: 'F1',
      certificate_no: '',
      valid_upto: '',
    },
  ]);

  const [saving, setSaving] = useState(false);

  // Populate from existing session data if available
  useEffect(() => {
    if (session) {
      if (session.verification_type) {
        setVerificationType(session.verification_type);
      }
      if (session.environment) {
        const env = session.environment;
        setTemperature(env.temperature ?? '');
        setHumidity(env.humidity ?? '');
        setAtmosphericPressure(env.atmospheric_pressure ?? '');
        setSupplyVoltage(env.supply_voltage ?? '230.0');
        setFrequency(env.frequency ?? '50.0');
      }
      if (session.reference_weights && session.reference_weights.length > 0) {
        setReferenceWeights(
          session.reference_weights.map((w) => ({
            id: w.id,
            nominal_value: w.nominal_value ?? '',
            weight_class: w.weight_class ?? 'F1',
            certificate_no: w.certificate_no ?? '',
            valid_upto: w.valid_upto ? w.valid_upto.split('T')[0] : '',
          }))
        );
      }
    }
  }, [session]);

  const handleAddWeightRow = () => {
    setReferenceWeights((prev) => [
      ...prev,
      {
        nominal_value: '',
        weight_class: 'F1',
        certificate_no: '',
        valid_upto: '',
      },
    ]);
  };

  const handleRemoveWeightRow = (idx) => {
    setReferenceWeights((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateWeight = (idx, field, val) => {
    setReferenceWeights((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Save Environmental conditions
      await apiClient.patch(`/sessions/${id}/environment`, {
        temperature: temperature !== '' ? Number(temperature) : null,
        humidity: humidity !== '' ? Number(humidity) : null,
        atmospheric_pressure: atmosphericPressure !== '' ? Number(atmosphericPressure) : null,
        supply_voltage: supplyVoltage !== '' ? Number(supplyVoltage) : null,
        frequency: frequency !== '' ? Number(frequency) : null,
      });

      // 2. Save Reference Standard Weights (filter out empty rows)
      const validWeights = referenceWeights
        .filter((w) => w.nominal_value !== '' && !isNaN(Number(w.nominal_value)))
        .map((w) => ({
          nominal_value: Number(w.nominal_value),
          weight_class: w.weight_class?.trim() || null,
          certificate_no: w.certificate_no?.trim() || null,
          valid_upto: w.valid_upto || null,
        }));

      if (validWeights.length > 0) {
        await apiClient.post(`/sessions/${id}/reference-weights`, validWeights);
      }

      await refreshAll();
      toast.success('Test conditions & reference standards recorded successfully.');
      navigate(`/sessions/${id}/accuracy`);
    } catch (err) {
      console.error('Failed to save test conditions:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save test conditions';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = new Date(session?.started_at || session?.created_at || Date.now()).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Auto-filled Session Metadata Header */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>Administrative & Traceability Record</span>
            <Badge variant="outline" className="bg-slate-100 text-[10px] text-slate-600">
              OIML AUDIT TRAIL
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Tester Name */}
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold">Authorized Tester</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">AUTO</Badge>
            </div>
            <div className="font-bold text-slate-900 text-sm">{session?.tester_name || 'Authorized Metrologist'}</div>
            <div className="text-[11px] text-slate-500">{session?.tester_email}</div>
          </div>

          {/* Testing Laboratory */}
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold">Laboratory Facility</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">AUTO</Badge>
            </div>
            <div className="font-bold text-slate-900 text-sm truncate">{session?.lab_name || 'Central Metrology Lab'}</div>
            <div className="font-mono text-[11px] text-sky-700">Reg: {session?.lab_registration_no || 'NABL-OIML-2026'}</div>
          </div>

          {/* Date & Time */}
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold">Test Session Timestamp</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">AUTO</Badge>
            </div>
            <div className="font-bold text-slate-900 text-sm">{formattedDate}</div>
            <div className="text-[11px] text-slate-500">Legal Metrology Act ISO/IEC 17025</div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Environmental Conditions Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Thermometer className="h-4 w-4 text-sky-600" />
            <span>Environmental Test Conditions</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Ambient laboratory conditions recorded during metrological evaluation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Temperature */}
          <div className="space-y-1.5">
            <Label htmlFor="temperature" className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <Thermometer className="h-3.5 w-3.5 text-rose-500" />
              <span>Ambient Temp (°C)</span>
            </Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              placeholder="e.g. 20.5"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {/* Humidity */}
          <div className="space-y-1.5">
            <Label htmlFor="humidity" className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <CloudRain className="h-3.5 w-3.5 text-sky-500" />
              <span>Rel. Humidity (% RH)</span>
            </Label>
            <Input
              id="humidity"
              type="number"
              step="0.1"
              placeholder="e.g. 50.0"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {/* Atmospheric Pressure */}
          <div className="space-y-1.5">
            <Label htmlFor="atmosphericPressure" className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <Gauge className="h-3.5 w-3.5 text-indigo-500" />
              <span>Pressure (hPa / mbar)</span>
            </Label>
            <Input
              id="atmosphericPressure"
              type="number"
              step="0.1"
              placeholder="e.g. 1013.2"
              value={atmosphericPressure}
              onChange={(e) => setAtmosphericPressure(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {/* Supply Voltage */}
          <div className="space-y-1.5">
            <Label htmlFor="supplyVoltage" className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Supply Voltage (V)</span>
            </Label>
            <Input
              id="supplyVoltage"
              type="number"
              step="0.1"
              placeholder="230.0"
              value={supplyVoltage}
              onChange={(e) => setSupplyVoltage(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label htmlFor="frequency" className="text-xs font-semibold text-slate-700">
              Mains Frequency (Hz)
            </Label>
            <Input
              id="frequency"
              type="number"
              step="0.1"
              placeholder="50.0"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Reference Standard Weights Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Scale className="h-4 w-4 text-sky-600" />
              <span>Reference Standard Weights</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Calibrated standard test mass standards used for OIML verification
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddWeightRow}
            className="text-xs mt-2 sm:mt-0 border-slate-300"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Standard Weight
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-3">
          {referenceWeights.map((weight, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/60 items-end"
            >
              {/* Nominal Value */}
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Nominal Value (g) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 5000"
                  value={weight.nominal_value}
                  onChange={(e) => handleUpdateWeight(idx, 'nominal_value', e.target.value)}
                  className="h-8 text-xs font-mono bg-white"
                  required
                />
              </div>

              {/* Weight Class */}
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">OIML Class</Label>
                <Input
                  placeholder="e.g. E2, F1, M1"
                  value={weight.weight_class}
                  onChange={(e) => handleUpdateWeight(idx, 'weight_class', e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Certificate No */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Calibration Cert. No.</Label>
                <Input
                  placeholder="e.g. NPL-CAL-2026-004"
                  value={weight.certificate_no}
                  onChange={(e) => handleUpdateWeight(idx, 'certificate_no', e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Valid Upto */}
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Valid Upto</Label>
                <Input
                  type="date"
                  value={weight.valid_upto}
                  onChange={(e) => handleUpdateWeight(idx, 'valid_upto', e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Remove Button */}
              <div className="sm:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveWeightRow(idx)}
                  disabled={referenceWeights.length <= 1}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
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
            disabled={saving}
            className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-6"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Conditions...
              </>
            ) : (
              <>
                Save & Proceed to Accuracy Test <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default TestConditionsPage;
