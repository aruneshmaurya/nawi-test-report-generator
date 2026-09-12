import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const ReportsListPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Certificates Registry</h1>
          <p className="text-sm text-slate-500">Search and download issued calibration & verification reports</p>
        </div>
        <div className="w-full sm:w-72">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search report number, serial..." className="pl-9" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issued Certificates Archive</CardTitle>
          <CardDescription>Digitally signed certificates with cryptographic QR token bindings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
            <FileText className="h-8 w-8 mb-2 text-slate-300" />
            <p className="text-sm">Reports archive table will render here in Step 15.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsListPage;
