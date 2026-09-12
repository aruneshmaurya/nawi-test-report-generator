import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, ArrowRight, ArrowLeft } from 'lucide-react';

export const SummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate(`/sessions/${id}/discrimination`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Discrimination
        </Button>
        <Button onClick={() => navigate(`/sessions/${id}/report`)} className="bg-[#0b2545] hover:bg-[#134074]">
          Generate Official PDF <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-sky-600" />
            <span>Test Results Summary & Overall Compliance Verdict</span>
          </CardTitle>
          <CardDescription>Consolidated PASS/FAIL verdict across all four OIML R-76 test modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
            Page 8: Summary aggregation & remarks will render here in Step 15.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryPage;
