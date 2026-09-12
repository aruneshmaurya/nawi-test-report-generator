import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Scale,
  Plus,
  Search,
  RefreshCw,
  Play,
  Info,
  Layers,
  Sparkles,
  Loader2,
  Building2,
  Calendar,
  Zap,
  Tag,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';

export const InstrumentsPage = () => {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  // Start Session Modal State
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [verificationType, setVerificationType] = useState('INITIAL');
  const [startingSession, setStartingSession] = useState(false);

  // View Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailInstrument, setDetailInstrument] = useState(null);

  const fetchInstruments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/instruments');
      if (res.data?.success && Array.isArray(res.data?.data?.instruments)) {
        setInstruments(res.data.data.instruments);
      }
    } catch (err) {
      console.error('Failed to load instruments:', err);
      toast.error('Could not load instruments registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  // Filter & Sort Logic
  const filteredInstruments = useMemo(() => {
    return instruments
      .filter((inst) => {
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !q ||
          (inst.model && inst.model.toLowerCase().includes(q)) ||
          (inst.serial_number && inst.serial_number.toLowerCase().includes(q)) ||
          (inst.manufacturer_name && inst.manufacturer_name.toLowerCase().includes(q)) ||
          (inst.accuracy_class && inst.accuracy_class.toLowerCase().includes(q));

        const matchesClass = classFilter === 'ALL' || inst.accuracy_class === classFilter;
        const matchesType = typeFilter === 'ALL' || inst.instrument_type === typeFilter;

        return matchesSearch && matchesClass && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'CAPACITY_DESC') {
          return (Number(b.capacity_max) || 0) - (Number(a.capacity_max) || 0);
        }
        if (sortBy === 'CAPACITY_ASC') {
          return (Number(a.capacity_max) || 0) - (Number(b.capacity_max) || 0);
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [instruments, searchTerm, classFilter, typeFilter, sortBy]);

  // Metric counts
  const totalCount = instruments.length;
  const classIandIICount = instruments.filter((i) => i.accuracy_class === 'I' || i.accuracy_class === 'II').length;
  const classIIICount = instruments.filter((i) => i.accuracy_class === 'III').length;
  const multiRangeCount = instruments.filter((i) => i.instrument_type === 'MULTI_RANGE').length;

  const handleOpenStartSession = (inst) => {
    setSelectedInstrument(inst);
    setVerificationType('INITIAL');
    setStartModalOpen(true);
  };

  const handleStartSessionSubmit = async () => {
    if (!selectedInstrument?.id) return;
    setStartingSession(true);
    try {
      const res = await apiClient.post('/sessions', {
        instrument_id: selectedInstrument.id,
        verification_type: verificationType,
      });

      if (res.data?.success && res.data?.data?.session?.id) {
        toast.success(`Session ${res.data.data.session.session_number} initialized!`);
        setStartModalOpen(false);
        navigate(`/sessions/${res.data.data.session.id}/conditions`);
      } else {
        throw new Error(res.data?.message || 'Failed to initialize session');
      }
    } catch (err) {
      console.error('Session initiation failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Could not start test session');
    } finally {
      setStartingSession(false);
    }
  };

  const handleOpenDetails = (inst) => {
    setDetailInstrument(inst);
    setDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Instruments Registry</h1>
          <p className="text-sm text-slate-500">
            Manage weighing instruments registered for calibration and testing under OIML R-76
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInstruments}
            disabled={loading}
            className="text-xs border-slate-300"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            onClick={() => navigate('/instruments/new')}
            className="bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Instrument
          </Button>
        </div>
      </div>

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Registered</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Scale className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-600">Class I & II (Precision)</p>
              <h3 className="text-2xl font-bold text-indigo-700 mt-1">{classIandIICount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-sky-600">Class III (Commercial)</p>
              <h3 className="text-2xl font-bold text-sky-800 mt-1">{classIIICount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600">Multi-Range Devices</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{multiRangeCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Registered Weighing Devices</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Search and select an instrument to initiate an official OIML test verification session
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search model, serial, make..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              {/* Class Filter */}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                aria-label="Filter by accuracy class"
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="ALL">All Classes</option>
                <option value="I">Class I (Special)</option>
                <option value="II">Class II (High)</option>
                <option value="III">Class III (Medium)</option>
                <option value="IIII">Class IIII (Ordinary)</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by instrument type"
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="ALL">All Types</option>
                <option value="SINGLE_RANGE">Single Range</option>
                <option value="MULTI_RANGE">Multi Range</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort instruments"
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="CAPACITY_DESC">Capacity (High to Low)</option>
                <option value="CAPACITY_ASC">Capacity (Low to High)</option>
              </select>

              {(searchTerm || classFilter !== 'ALL' || typeFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setClassFilter('ALL');
                    setTypeFilter('ALL');
                  }}
                  className="h-8 text-xs text-slate-500 hover:text-slate-800"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              <p className="text-xs font-medium text-slate-600">Loading instrument registry...</p>
            </div>
          ) : filteredInstruments.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
              <Scale className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-800">No instruments found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {instruments.length === 0
                  ? 'No instruments have been registered yet. Click "Add Instrument" to register a device.'
                  : 'No instruments match your selected search or filter criteria.'}
              </p>
              <Button
                onClick={() => navigate('/instruments/new')}
                className="mt-4 bg-[#0b2545] hover:bg-[#134074] text-white text-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Register First Instrument
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-50 text-xs">
                    <TableHead className="font-bold text-slate-700">Model & Serial No.</TableHead>
                    <TableHead className="font-bold text-slate-700">Manufacturer</TableHead>
                    <TableHead className="font-bold text-slate-700">Accuracy Class</TableHead>
                    <TableHead className="font-bold text-slate-700">Capacity (Max)</TableHead>
                    <TableHead className="font-bold text-slate-700">Scale Interval (e)</TableHead>
                    <TableHead className="font-bold text-slate-700">Intervals (n)</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredInstruments.map((inst) => {
                    const classBadgeColor =
                      inst.accuracy_class === 'I'
                        ? 'bg-purple-100 text-purple-800'
                        : inst.accuracy_class === 'II'
                        ? 'bg-indigo-100 text-indigo-800'
                        : inst.accuracy_class === 'III'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-100 text-slate-800';

                    return (
                      <TableRow key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Model & Serial */}
                        <TableCell>
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{inst.model}</span>
                            {inst.instrument_type === 'MULTI_RANGE' && (
                              <span className="text-[9px] uppercase px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold">
                                Multi-Range
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
                            <span>SN: {inst.serial_number}</span>
                          </div>
                        </TableCell>

                        {/* Manufacturer */}
                        <TableCell className="text-slate-700 font-medium">
                          {inst.manufacturer_name || 'Standard Manufacturer'}
                          {inst.manufacturer_country && (
                            <span className="text-[10px] text-slate-400 ml-1">({inst.manufacturer_country})</span>
                          )}
                        </TableCell>

                        {/* Accuracy Class */}
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${classBadgeColor}`}>
                            Class {inst.accuracy_class}
                          </span>
                        </TableCell>

                        {/* Max Capacity */}
                        <TableCell className="font-mono font-semibold text-slate-800">
                          {inst.capacity_max}g
                          {Number(inst.capacity_min) > 0 && (
                            <span className="text-[10px] text-slate-400 block font-normal">Min: {inst.capacity_min}g</span>
                          )}
                        </TableCell>

                        {/* Verification Interval (e) */}
                        <TableCell className="font-mono text-slate-700 font-medium">
                          e = {inst.verification_interval_e}g
                          {inst.actual_interval_d && (
                            <span className="text-[10px] text-slate-400 block">d = {inst.actual_interval_d}g</span>
                          )}
                        </TableCell>

                        {/* Intervals (n) */}
                        <TableCell className="font-mono text-slate-600 font-medium">
                          {inst.verification_intervals_n ? Number(inst.verification_intervals_n).toLocaleString() : '--'}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetails(inst)}
                              className="h-7 px-2 text-[11px] border-slate-300 text-slate-600 hover:bg-slate-100"
                              title="View Instrument Specifications"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleOpenStartSession(inst)}
                              className="h-7 px-2.5 text-[11px] bg-[#0b2545] hover:bg-[#134074] text-white font-semibold shadow-xs"
                              title="Start OIML Test Session for this instrument"
                            >
                              <Play className="mr-1 h-3 w-3 fill-current" /> Test Session
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Test Session Modal */}
      <Dialog open={startModalOpen} onOpenChange={setStartModalOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base font-bold text-slate-900">
              <Play className="h-4 w-4 text-sky-600 fill-current" />
              <span>Initiate OIML R-76 Test Session</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Start an official verification workflow for the selected weighing instrument.
            </DialogDescription>
          </DialogHeader>

          {selectedInstrument && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Instrument Model:</span>
                  <span className="font-bold text-slate-900">{selectedInstrument.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Serial Number:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedInstrument.serial_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Accuracy Class:</span>
                  <span className="font-semibold text-sky-800">Class {selectedInstrument.accuracy_class}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Capacity:</span>
                  <span className="font-semibold text-slate-800">{selectedInstrument.capacity_max}g (e={selectedInstrument.verification_interval_e}g)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="verifTypeSelect" className="text-xs font-semibold text-slate-700">
                  Verification Category
                </Label>
                <select
                  id="verifTypeSelect"
                  value={verificationType}
                  onChange={(e) => setVerificationType(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="INITIAL">Initial Verification (Standard 1x MPE bounds)</option>
                  <option value="IN_SERVICE">Subsequent / In-Service Inspection (2x MPE bounds)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  {verificationType === 'INITIAL'
                    ? 'Initial verification applies standard OIML R-76 Table 6 error limits.'
                    : 'In-service inspection applies double MPE tolerance rules in accordance with Legal Metrology Regulations.'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setStartModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleStartSessionSubmit}
              disabled={startingSession}
              className="bg-[#0b2545] hover:bg-[#134074] text-white"
            >
              {startingSession ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Launching Wizard...
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Start Evaluation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Instrument Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-lg font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base font-bold text-slate-900">
              <Scale className="h-5 w-5 text-sky-600" />
              <span>Instrument Technical Specifications</span>
            </DialogTitle>
          </DialogHeader>

          {detailInstrument && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Model Name</span>
                  <p className="font-bold text-slate-900">{detailInstrument.model}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Serial Number</span>
                  <p className="font-mono font-bold text-slate-900">{detailInstrument.serial_number}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Manufacturer</span>
                  <p className="font-semibold text-slate-800">{detailInstrument.manufacturer_name || 'Standard'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Accuracy Class</span>
                  <p className="font-bold text-sky-800">Class {detailInstrument.accuracy_class}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Max Capacity (Max)</span>
                  <p className="font-semibold text-slate-800">{detailInstrument.capacity_max}g</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Min Capacity (Min)</span>
                  <p className="font-semibold text-slate-800">{detailInstrument.capacity_min || 0}g</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Verification Interval (e)</span>
                  <p className="font-semibold text-slate-800">{detailInstrument.verification_interval_e}g</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Intervals Count (n)</span>
                  <p className="font-semibold text-slate-800">{detailInstrument.verification_intervals_n || '--'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Power Source</span>
                  <p className="font-medium text-slate-800">{detailInstrument.power_source || '230V AC / 50Hz'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Software / Firmware</span>
                  <p className="font-mono text-slate-700">{detailInstrument.software_version || detailInstrument.firmware_version || 'v1.0.0'}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" size="sm" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
            {detailInstrument && (
              <Button
                size="sm"
                onClick={() => {
                  setDetailsModalOpen(false);
                  handleOpenStartSession(detailInstrument);
                }}
                className="bg-[#0b2545] hover:bg-[#134074] text-white"
              >
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Start Test Session
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstrumentsPage;
