import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Trash2, Loader2, AlertCircle } from 'lucide-react';

export const TestReadingsTable = ({
  rows,
  onUpdateRow,
  onSubmitRow,
  onDeleteRow,
  submittingRowId,
  deletingRowId,
  positionColumnLabel = 'Position / Load Point',
  isEccentricity = false,
}) => {
  const formatError = (val) => {
    if (val === null || val === undefined || val === '') return '--';
    const num = Number(val);
    if (isNaN(num)) return '--';
    return num > 0 ? `+${num}g` : `${num}g`;
  };

  const formatMpe = (val) => {
    if (val === null || val === undefined || val === '') return '--';
    const num = Number(val);
    if (isNaN(num)) return '--';
    return `±${num}g`;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/90 text-xs hover:bg-transparent">
            <TableHead className="w-[180px]">{positionColumnLabel}</TableHead>
            <TableHead className="w-[140px]">Standard Wt (L)</TableHead>
            <TableHead className="w-[140px]">Indicated Wt (I)</TableHead>
            <TableHead className="w-[120px] bg-slate-100/50">Error (E = I - L)</TableHead>
            <TableHead className="w-[120px] bg-slate-100/50">MPE (OIML)</TableHead>
            <TableHead className="w-[110px] text-center">Result</TableHead>
            <TableHead className="w-[100px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const isRecorded = Boolean(row.id);
            const isFailing = row.result === 'FAIL';
            const isPassing = row.result === 'PASS';
            const isRowSubmitting = submittingRowId === (row.key || row.id || index);
            const isRowDeleting = deletingRowId === row.id;

            return (
              <TableRow
                key={row.key || row.id || index}
                className={`transition-colors ${
                  isFailing
                    ? 'bg-rose-50/80 hover:bg-rose-50 border-rose-200 text-rose-950 font-medium'
                    : isPassing
                    ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                    : 'hover:bg-slate-50/60'
                }`}
              >
                {/* Column 1: Position / Load Point identifier */}
                <TableCell className="text-xs font-semibold">
                  <div className="flex items-center space-x-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                      {index + 1}
                    </span>
                    <span className="text-slate-800">{row.label || row.position || `Point ${index + 1}`}</span>
                  </div>
                </TableCell>

                {/* Column 2: Standard Weight (L) */}
                <TableCell>
                  {isRecorded ? (
                    <span className="font-mono text-xs font-medium text-slate-800">
                      {row.standard_value} g
                    </span>
                  ) : (
                    <Input
                      type="number"
                      step="any"
                      placeholder="Std Wt"
                      value={row.standard_value || ''}
                      onChange={(e) => onUpdateRow(index, 'standard_value', e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  )}
                </TableCell>

                {/* Column 3: Indicated Weight (I) */}
                <TableCell>
                  {isRecorded ? (
                    <span className="font-mono text-xs font-medium text-slate-800">
                      {row.indicated_value} g
                    </span>
                  ) : (
                    <Input
                      type="number"
                      step="any"
                      placeholder="Indicated"
                      value={row.indicated_value || ''}
                      onChange={(e) => onUpdateRow(index, 'indicated_value', e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  )}
                </TableCell>

                {/* Column 4: Error (Auto, Read-Only grey) */}
                <TableCell className="bg-slate-50/70 font-mono text-xs font-semibold">
                  {isRecorded ? (
                    <span className={isFailing ? 'text-rose-700' : 'text-slate-700'}>
                      {formatError(row.error)}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">auto</span>
                  )}
                </TableCell>

                {/* Column 5: MPE (Auto, Read-Only grey) */}
                <TableCell className="bg-slate-50/70 font-mono text-xs">
                  {isRecorded ? (
                    <span className="text-slate-700">{formatMpe(row.mpe)}</span>
                  ) : (
                    <span className="text-slate-400 italic">auto</span>
                  )}
                </TableCell>

                {/* Column 6: Result Badge */}
                <TableCell className="text-center">
                  {isRecorded ? (
                    <Badge variant={isPassing ? 'pass' : 'fail'} className="text-[10px] font-bold">
                      {row.result}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-400">
                      PENDING
                    </Badge>
                  )}
                </TableCell>

                {/* Column 7: Action */}
                <TableCell className="text-right">
                  {isRecorded ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteRow(row.id)}
                      disabled={isRowDeleting}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete reading"
                    >
                      {isRowDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onSubmitRow(index)}
                      disabled={
                        isRowSubmitting ||
                        row.standard_value === '' ||
                        row.standard_value === undefined ||
                        row.indicated_value === '' ||
                        row.indicated_value === undefined
                      }
                      className="h-7 px-2.5 text-xs bg-[#0b2545] hover:bg-[#134074] text-white"
                    >
                      {isRowSubmitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TestReadingsTable;
