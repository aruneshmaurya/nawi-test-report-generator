import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import TestReadingsTable from '@/components/shared/TestReadingsTable';

export const AccuracyTestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, instrument, tests, refetchTests } = useOutletContext();

  const [testRecord, setTestRecord] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingRowId, setSubmittingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);

  // Initialize or get ACCURACY test on mount
  const initTest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/sessions/${id}/tests`, {
        test_type_code: 'ACCURACY',
      });
      if (res.data?.success && res.data?.data?.test) {
        setTestRecord(res.data.data.test);
      }
    } catch (err) {
      console.error('Failed to initialize accuracy test:', err);
      toast.error('Failed to initialize accuracy test module');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    initTest();
  }, [initTest]);

  // Sync readings and build scaffold rows
  useEffect(() => {
    const accuracyTest = tests.find((t) => t.test_type_code === 'ACCURACY');
    const existingReadings = accuracyTest?.readings || [];

    const maxCap = Number(instrument?.capacity_max) || 15000;
    const minCap = Number(instrument?.capacity_min) || 0;

    // Standard pre-seeded load point scaffolds
    const defaultPoints = [
      { label: 'Near-Zero (Min)', standard_value: minCap > 0 ? minCap : 20, indicated_value: '' },
      { label: '~25% Max', standard_value: Math.round(maxCap * 0.25), indicated_value: '' },
      { label: '~50% Max', standard_value: Math.round(maxCap * 0.5), indicated_value: '' },
      { label: '~75% Max', standard_value: Math.round(maxCap * 0.75), indicated_value: '' },
      { label: 'Near-Max Capacity', standard_value: maxCap, indicated_value: '' },
    ];

    if (existingReadings.length > 0) {
      // Map existing recorded readings
      const mappedRows = existingReadings.map((r, i) => ({
        id: r.id,
        key: r.id,
        label: r.extra_data?.load_point ? `Point ${r.reading_no}` : (defaultPoints[i]?.label || `Reading ${i + 1}`),
        standard_value: r.standard_value,
        indicated_value: r.indicated_value,
        error: r.error,
        mpe: r.mpe,
        result: r.result,
      }));

      // Append any unsubmitted remaining scaffolds if fewer than 5
      if (mappedRows.length < 5) {
        for (let i = mappedRows.length; i < 5; i++) {
          mappedRows.push({
            key: `scaffold-${i}`,
            label: defaultPoints[i].label,
            standard_value: defaultPoints[i].standard_value,
            indicated_value: '',
          });
        }
      }
      setReadings(mappedRows);
    } else {
      // Clean scaffold
      setReadings(
        defaultPoints.map((p, i) => ({
          key: `scaffold-${i}`,
          label: p.label,
          standard_value: p.standard_value,
          indicated_value: '',
        }))
      );
    }
  }, [tests, instrument]);

  const handleUpdateRow = (idx, field, value) => {
    setReadings((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleAddReadingRow = () => {
    setReadings((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        label: `Load Point ${prev.length + 1}`,
        standard_value: '',
        indicated_value: '',
      },
    ]);
  };

  const handleSubmitRow = async (idx) => {
    const row = readings[idx];
    if (!testRecord?.id) {
      toast.error('Test record not initialized');
      return;
    }

    setSubmittingRowId(row.key || idx);
    try {
      const res = await apiClient.post(
        `/sessions/${id}/tests/${testRecord.id}/readings`,
        {
          standard_value: Number(row.standard_value),
          indicated_value: Number(row.indicated_value),
          load_point: idx + 1,
        }
      );

      if (res.data?.success && res.data?.data?.reading) {
        const recorded = res.data.data.reading;
        if (recorded.result === 'FAIL') {
          toast.error(`Reading evaluated as FAIL! Error ${recorded.error}g exceeds MPE ${recorded.mpe}g.`);
        } else {
          toast.success(`Reading evaluated as PASS (Error ${recorded.error}g ≤ MPE ${recorded.mpe}g).`);
        }
        await refetchTests();
      }
    } catch (err) {
      console.error('Failed to submit accuracy reading:', err);
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

  return (
    <div className="space-y-6">
      {/* Test Overview Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Target className="h-5 w-5 text-sky-600" />
                <span>Page 4: Accuracy & Weighing Performance Test</span>
              </CardTitle>
              {failingCount > 0 ? (
                <Badge variant="fail" className="text-xs">
                  {failingCount} FAILING POINT{failingCount > 1 ? 'S' : ''}
                </Badge>
              ) : recordedCount > 0 ? (
                <Badge variant="pass" className="text-xs">
                  {recordedCount} RECORDED (PASS)
                </Badge>
              ) : null}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Test weighing error across ascending and descending load points per OIML R-76 Section 3.5.1
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddReadingRow}
            className="text-xs mt-2 sm:mt-0 border-slate-300"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Reading
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Real-time MPE calculation rules banner */}
          <div className="rounded-lg bg-sky-50/70 border border-sky-200 p-3 text-xs text-sky-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold">MPE Resolution:</span>
              <span>
                Class {instrument?.accuracy_class || 'III'} ({session?.verification_type === 'INITIAL' ? 'Initial' : 'In-Service'}, e = {instrument?.verification_interval_e || 2}g)
              </span>
            </div>
            <span className="text-[11px] font-mono text-sky-700">
              0-500e: ±1e &bull; 500-2000e: ±2e &bull; &gt;2000e: ±3e
            </span>
          </div>

          {/* Shared Test Readings Table */}
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
              positionColumnLabel="Load Point (Test Range)"
            />
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/sessions/${id}/conditions`)}
            className="text-xs"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Conditions
          </Button>

          <Button
            onClick={() => navigate(`/sessions/${id}/eccentricity`)}
            disabled={recordedCount === 0}
            className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-md text-xs font-semibold px-6"
          >
            Next: Eccentricity Test <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AccuracyTestPage;
