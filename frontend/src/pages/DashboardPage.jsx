import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Scale,
  Plus,
  CheckCircle2,
  Clock,
  FileCheck,
  Calendar,
  Eye,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch test sessions for the current lab
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/sessions');
        if (res.data?.success && res.data?.data?.sessions) {
          setSessions(res.data.data.sessions);
        }
      } catch (err) {
        console.error('Failed to load dashboard sessions:', err);
        toast.error('Could not load test sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Compute stat card metrics
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length;
  const approvedSessions = sessions.filter((s) => s.status === 'APPROVED').length;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekSessions = sessions.filter((s) => {
    const date = new Date(s.started_at || s.created_at);
    return date >= oneWeekAgo;
  }).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="draft">DRAFT</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="progress">IN PROGRESS</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">COMPLETED</Badge>;
      case 'APPROVED':
        return <Badge variant="approved">APPROVED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getResultBadge = (result) => {
    if (!result) {
      return <Badge variant="outline" className="text-slate-400 border-slate-200">PENDING</Badge>;
    }
    if (result === 'PASS') {
      return <Badge variant="pass">PASS</Badge>;
    }
    if (result === 'FAIL') {
      return <Badge variant="fail">FAIL</Badge>;
    }
    return <Badge variant="outline">{result}</Badge>;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleViewSession = (session) => {
    if (session.status === 'APPROVED') {
      navigate(`/sessions/${session.id}/report`);
    } else if (session.status === 'COMPLETED') {
      navigate(`/sessions/${session.id}/summary`);
    } else {
      navigate(`/sessions/${session.id}/conditions`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Legal Metrology Testing Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Assigned Facility: <span className="font-semibold text-slate-700">{user?.lab_name || 'Central Metrology Laboratory'}</span>
          </p>
        </div>
        <Button
          onClick={() => navigate('/instruments/new')}
          className="bg-[#0b2545] hover:bg-[#134074] text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Start New Test Session
        </Button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sessions */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Sessions
            </CardTitle>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
              <Scale className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : totalSessions}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total calibrated instruments</p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : completedSessions}
            </div>
            <p className="text-xs text-slate-500 mt-1">Tests finished, awaiting approval</p>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <FileCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : approvedSessions}
            </div>
            <p className="text-xs text-slate-500 mt-1">Verified & certificate ready</p>
          </CardContent>
        </Card>

        {/* This Week */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              This Week
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : thisWeekSessions}
            </div>
            <p className="text-xs text-slate-500 mt-1">Past 7 days volume</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Table */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">Recent Test Sessions</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Non-Automatic Weighing Instruments calibration history for this laboratory
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/instruments')}
            className="text-xs font-medium mt-2 sm:mt-0"
          >
            View Instruments Registry <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              <p className="text-xs text-slate-500">Loading lab session records...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 rounded-full bg-slate-100 mb-3 text-slate-400">
                <Scale className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">No test sessions recorded yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                Register an instrument or create your first OIML R-76 test session to begin.
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/instruments/new')}
                className="bg-[#0b2545] hover:bg-[#134074]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Start New Test Session
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[160px]">Session Number</TableHead>
                  <TableHead>Instrument Model & Serial</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Overall Result</TableHead>
                  <TableHead className="w-[90px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="hover:bg-slate-50/70">
                    <TableCell className="font-mono text-xs font-semibold text-sky-900">
                      {session.session_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs text-slate-900">
                        {session.instrument_model || 'Standard Weighing Balance'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        SN: {session.instrument_serial || '--'} &bull; Class {session.accuracy_class || 'III'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(session.started_at || session.created_at)}
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>{getResultBadge(session.overall_result)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSession(session)}
                        className="h-8 px-2 text-xs font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-50"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
