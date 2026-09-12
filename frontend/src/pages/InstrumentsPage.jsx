import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, Scale } from 'lucide-react';

export const InstrumentsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Instruments Registry</h1>
          <p className="text-sm text-slate-500">Manage weighing instruments registered for calibration and testing</p>
        </div>
        <Button onClick={() => navigate('/instruments/new')} className="bg-[#0b2545] hover:bg-[#134074]">
          <Plus className="mr-2 h-4 w-4" />
          Add Instrument
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Weighing Devices</CardTitle>
          <CardDescription>Search and select an instrument to initiate a new test session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
            <Scale className="h-8 w-8 mb-2 text-slate-300" />
            <p className="text-sm">Instruments table & search filter will load here in Step 13.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstrumentsPage;
