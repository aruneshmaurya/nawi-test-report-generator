import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-600 mb-4">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The requested metrological testing route does not exist or has been moved.
      </p>
      <Button
        onClick={() => navigate('/dashboard')}
        className="mt-6 bg-[#0b2545] hover:bg-[#134074]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
      </Button>
    </div>
  );
};

export default NotFoundPage;
