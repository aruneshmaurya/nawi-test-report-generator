import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import TestReadingsTable from '@/components/shared/TestReadingsTable';

const ECCENTRICITY_POSITIONS = [
  { code: 'CENTRE', label: '1. Centre of Platform', short: 'Centre' },
  { code: 'FRONT_LEFT', label: '2. Front-Left Corner', short: 'Front-Left' },
  { code: 'FRONT_RIGHT', label: '3. Front-Right Corner', short: 'Front-Right' },
  { code: 'BACK_LEFT', label: '4. Back-Left Corner', short: 'Back-Left' },
  { code: 'BACK_RIGHT', label: '5. Back-Right Corner', short: 'Back-Right' },
];

export const EccentricityTestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, instrument, tests, refetchTests } = useOutletContext();

  const [testRecord, setTestRecord] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingRowId, setSubmittingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);

  // Suggested standard test load: 1/3 Max capacity
  const maxCap = Number(instrument?.capacity_max) || 15000;
  const suggestedLoad = Math.round(maxCap / 3);

  // Initialize or get ECCENTRICITY test on mount
  const initTest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/sessions/${id}/tests`, {
        test_type_code: 'ECCENTRICITY',
      });
      if (res.data?.success && res.data?.data?.test) {
        setTestRecord(res.data.data.test);
      }
    } catch (err) {
      console.error('Failed to initialize eccentricity test:', err);
      toast.error('Failed to initialize eccentricity test module');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    initTest();
  }, [initTest]);

  // Sync existing recorded readings into the 5 fixed positions
  useEffect(() => {
    const eccTest = tests.find((t) => t.test_type_code === 'ECCENTRICITY');
    const existingReadings = eccTest?.readings || [];

    const positionMap = {};
    existingReadings.forEach((r) => {
      if (r.position) {
        positionMap[r.position] = r;
      }
    });

    const mappedRows = ECCENTRICITY_POSITIONS.map((pos, idx) => {
      const recorded = positionMap[pos.code];
      if (recorded) {
        return {
          id: recorded.id,
          key: recorded.id,
          position: pos.code,
          label: pos.label,
          standard_value: recorded.standard_value,
          indicated_value: recorded.indicated_value,
          error: recorded.error,
          mpe: recorded.mpe,
          result: recorded.result,
        };
      }
      return {
        key: `ecc-pos-${pos.code}`,
        position: pos.code,
        label: pos.label,
        standard_value: suggestedLoad,
        indicated_value: '',
      };
    });

    setReadings(mappedRows);
  }, [tests, suggestedLoad]);

  const handleUpdateRow = (idx, field, value) => {
    setReadings((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleSubmitRow = async (idx) => {
    const row = readings[idx];
    if (!testRecord?.id) return;

    setSubmittingRowId(row.key || idx);
    try {
      const res = await apiClient.post(
        `/sessions/${id}/tests/${testRecord.id}/readings`,
        {
          position: row.position,
          standard_value: Number(row.standard_value),
          indicated_value: Number(row.indicated_value),
        }
      );

      if (res.data?.success && res.data?.data?.reading) {
        const recorded = res.data.data.reading;
        if (recorded.result === 'FAIL') {
          toast.error(`Eccentricity failed at ${row.label}: Error ${recorded.error}g > MPE ${recorded.mpe}g`);
        } else {
          toast.success(`Eccentricity PASS at ${row.label}`);
        }
        await refetchTests();
      }
    } catch (err) {
      console.error('Failed to submit eccentricity reading:', err);
      toast.error(err.response?.data?.message || 'Failed to submit reading');
    } finally {
      setSubmittingRowId(null);
    }
  };

  const handleDeleteRow = async (readingId) => {
    if (!readingId || !testRecord?.id) return;
    setDeletingRowId(readingId);

    try {
      await apiClient.delete(`/sessions/${id}/tests/${testRecord.id}/readings/${readingId}`);
      toast.success('Reading removed');
      await refetchTests();
    } catch (err) {
      console.error('Failed to delete reading:', err);
      toast.error(err.response?.data?.message || 'Failed to delete reading');
    } finally {
      setDeletingRowId(null);
    }
  };

  const recordedCount = readings.filter((r) => Boolean(r.id)).length;
  const failingCount = readings.filter((r) => r.result === 'FAIL').length;

  // Helper to color diagram positions
  const getPosStatusColor = (posCode) => {
    const r = readings.find((item) => item.position === posCode);
    if (!r || !r.id) return { fill: '#f8fafc', stroke: '#cbd5e1', text: '#64748b' };
    if (r.result === 'FAIL') return { fill: '#fef2f2', stroke: '#f87171', text: '#b91c1c' };
    if (r.result === 'PASS') return { fill: '#ecfdf5', stroke: '#34d399', text: '#047857' };
    return { fill: '#f8fafc', stroke: '#cbd5e1', text: '#64748b' };
  };

  const centreColor = getPosStatusColor('CENTRE');
  const flColor = getPosStatusColor('FRONT_LEFT');
  const frColor = getPosStatusColor('FRONT_RIGHT');
  const blColor = getPosStatusColor('BACK_LEFT');
  const brColor = getPosStatusColor('BACK_RIGHT');

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <LayoutGrid className="h-5 w-5 text-sky-600" />
                <span>Page 5: Eccentricity Test (Off-Center Loading)</span>
              </CardTitle>
              {failingCount > 0 ? (
                <Badge variant="fail" className="text-xs">
                  {failingCount} FAILING POSITION{failingCount > 1 ? 'S' : ''}
                </Badge>
              ) : recordedCount === 5 ? (
                <Badge variant="pass" className="text-xs">
                  ALL 5 POSITIONS PASS
                </Badge>
              ) : null}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Verify platform load receptor uniformity per OIML R-76 Section 3.6.2 (Suggested Load: ~1/3 Max = {suggestedLoad}g)
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* 5-Position Visual Platform Diagram */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Load Receptor Platform Map
              </span>
              <p className="text-xs text-slate-500 max-w-sm">
                Apply standard test weight ({suggestedLoad}g) consecutively at each designated receptor corner.
              </p>
            </div>

            {/* Inline SVG Platform Diagram */}
            <div className="shrink-0">
              <svg width="240" height="150" viewBox="0 0 240 150" className="rounded-lg shadow-inner bg-white border border-slate-300">
                {/* Platform Outline */}
                <rect x="15" y="15" width="210" height="120" rx="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

                {/* Back-Left (4) */}
                <circle cx="50" cy="40" r="16" fill={blColor.fill} stroke={blColor.stroke} strokeWidth="2" />
                <text x="50" y="44" textAnchor="middle" fontSize="10" fontWeight="bold" fill={blColor.text}>4. BL</text>

                {/* Back-Right (5) */}
                <circle cx="190" cy="40" r="16" fill={brColor.fill} stroke={brColor.stroke} strokeWidth="2" />
                <text x="190" y="44" textAnchor="middle" fontSize="10" fontWeight="bold" fill={brColor.text}>5. BR</text>

                {/* Centre (1) */}
                <circle cx="120" cy="75" r="18" fill={centreColor.fill} stroke={centreColor.stroke} strokeWidth="2.5" />
                <text x="120" y="79" textAnchor="middle" fontSize="11" fontWeight="bold" fill={centreColor.text}>1. C</text>

                {/* Front-Left (2) */}
                <circle cx="50" cy="110" r="16" fill={flColor.fill} stroke={flColor.stroke} strokeWidth="2" />
                <text x="50" y="114" textAnchor="middle" fontSize="10" fontWeight="bold" fill={flColor.text}>2. FL</text>

                {/* Front-Right (3) */}
                <circle cx="190" cy="110" r="16" fill={frColor.fill} stroke={frColor.stroke} strokeWidth="2" />
                <text x="190" y="114" textAnchor="middle" fontSize="10" fontWeight="bold" fill={frColor.text}>3. FR</text>
              </svg>
            </div>
          </div>

          {/* Fixed 5 Positions Table */}
          {loading ? (
            <div className="flex h-40 items-center justify-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
            </div>
          ) : (
            <TestReadingsTable
              rows={readings}
              onUpdateRow={handleUpdateRow}
              onSubmitRow={handleSubmitRow}
              onDeleteRow={handleDeleteRow}
              submittingRowId={submittingRowId}
              deletingRowId={deletingRowId}
              positionColumnLabel="Receptor Position"
              isEccentricity={true}
            />
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/sessions/${id}/accuracy`)}
            className="text-xs"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Accuracy
          </Button>

          <Button
            onClick={() => navigate(`/sessions/${id}/repeatability`)}
            disabled={recordedCount === 0}
            className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-6"
          >
            Next: Repeatability Test <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EccentricityTestPage;
