import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft, Download, ShieldCheck } from 'lucide-react';

export const ReportViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate(`/sessions/${id}/summary`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Summary
        </Button>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="border-slate-300">
            <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" /> Digital Sign
          </Button>
          <Button className="bg-[#0b2545] hover:bg-[#134074]">
            <Download className="mr-2 h-4 w-4" /> Download Certificate
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-sky-600" />
            <span>Official OIML R-76 Test Report & Certificate</span>
          </CardTitle>
          <CardDescription>Embedded PDF viewer & QR verification token</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
            Page 9: PDF Certificate viewer & signature pad will render here in Step 15.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportViewPage;
