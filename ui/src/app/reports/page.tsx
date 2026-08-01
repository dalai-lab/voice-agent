'use client';

import { addDays, format, subDays } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, PhoneCall, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  getDailyReportApiV1OrganizationsReportsDailyGet,
  getDailyRunsDetailApiV1OrganizationsReportsDailyRunsGet,
  getPreferencesApiV1OrganizationsPreferencesGet,
  getWorkflowOptionsApiV1OrganizationsReportsWorkflowsGet
} from '@/client/sdk.gen';
import type { WorkflowRunDetail } from '@/client/types.gen';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { formatContactOrigin, getDispositionBadge } from '@/lib/dispositionLabels';

import { DispositionChart } from './components/DispositionChart';
import { DurationChart } from './components/DurationChart';
import { MetricsCards } from './components/MetricsCards';

interface WorkflowOption {
  id: number;
  name: string;
}

interface DailyReport {
  date: string;
  timezone: string;
  workflow_id: number | null;
  metrics: {
    total_runs: number;
    xfer_count: number;
  };
  disposition_distribution: Array<{
    disposition: string;
    count: number;
    percentage: number;
  }>;
  call_duration_distribution: Array<{
    bucket: string;
    range_start: number;
    range_end: number | null;
    count: number;
    percentage: number;
  }>;
}

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [runsDetail, setRunsDetail] = useState<WorkflowRunDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');
  const auth = useAuth();

  // Fetch workflows on mount
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!auth.isAuthenticated) return;

      try {
        const response = await getWorkflowOptionsApiV1OrganizationsReportsWorkflowsGet({});
        if (response.data) {
          setWorkflows(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch workflows:', err);
      }
    };
    fetchWorkflows();
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!auth.isAuthenticated) return;

      try {
        const response = await getPreferencesApiV1OrganizationsPreferencesGet();
        if (response.data?.timezone) {
          setTimezone(response.data.timezone);
        }
      } catch (err) {
        console.error('Failed to fetch organization preferences:', err);
      }
    };
    fetchPreferences();
  }, [auth.isAuthenticated]);

  // Fetch report data when date or workflow changes
  useEffect(() => {
    const fetchReport = async () => {
      if (!auth.isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const workflowId = selectedWorkflow === 'all' ? undefined : parseInt(selectedWorkflow);

        const [reportRes, runsRes] = await Promise.all([
          getDailyReportApiV1OrganizationsReportsDailyGet({
            query: {
              date: dateStr,
              timezone,
              ...(workflowId && { workflow_id: workflowId })
            },
          }),
          getDailyRunsDetailApiV1OrganizationsReportsDailyRunsGet({
            query: {
              date: dateStr,
              timezone,
              ...(workflowId && { workflow_id: workflowId })
            },
          }),
        ]);

        if (reportRes.data) {
          setReport(reportRes.data as DailyReport);
        }
        if (runsRes.data) {
          setRunsDetail(runsRes.data);
        } else {
          setRunsDetail([]);
        }
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedDate, selectedWorkflow, timezone, auth.isAuthenticated]);

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleDownloadCSV = async () => {
    if (!auth.isAuthenticated) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      if (runsDetail && runsDetail.length > 0) {
        const headers = ['Phone Number', 'Disposition', 'Duration (seconds)', 'Workflow Run URL'];
        const rows = runsDetail.map((run: WorkflowRunDetail) => {
          const url = `${window.location.origin}/workflow/${run.workflow_id}/run/${run.run_id}`;
          return [
            run.phone_number || '',
            run.disposition || '',
            run.duration_seconds.toString(),
            url
          ];
        });

        const csvContent = [
          headers.join(','),
          ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const workflowName = selectedWorkflow === 'all'
          ? 'all_workflows'
          : workflows.find(w => w.id.toString() === selectedWorkflow)?.name?.replace(/\s+/g, '_') || 'workflow';

        link.setAttribute('href', url);
        link.setAttribute('download', `workflow_runs_${dateStr}_${workflowName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('No data available for download');
      }
    } catch (err) {
      console.error('Failed to download CSV:', err);
      alert('Failed to download CSV data');
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 bg-background text-foreground">
      {/* Header & Date Navigation & Workflow Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border/40">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Daily Analytics Reports</h1>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/40 text-muted-foreground border border-border/40">
              {timezone}
            </span>
            {selectedWorkflow !== 'all' && (
              <span className="text-cta font-medium">Filtered by: {workflows.find(w => w.id.toString() === selectedWorkflow)?.name}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Workflow Selector */}
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-[180px] h-9 rounded-lg border-border/60 text-xs bg-card/30">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflows</SelectItem>
              {workflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id.toString()}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg border-border/60 bg-card/30"
              onClick={handlePreviousDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px] h-9 rounded-lg text-xs font-semibold border-border/60 bg-card/30">
                  <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  {format(selectedDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl border border-border shadow-lg" align="end">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg border-border/60 bg-card/30"
              onClick={handleNextDay}
              disabled={isToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Download CSV Button */}
          {!loading && report && report.metrics.total_runs > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              className="h-9 rounded-lg text-xs font-semibold flex items-center gap-1.5 border-border/60 bg-card/30 hover:bg-card/60"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-xl animate-pulse" />
            <Skeleton className="h-20 rounded-xl animate-pulse" />
            <Skeleton className="h-20 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-xl animate-pulse" />
            <Skeleton className="h-64 rounded-xl animate-pulse" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm mx-auto border border-border bg-card/30 rounded-xl shadow-xs">
          <p className="text-xs font-semibold text-destructive">{error}</p>
        </div>
      )}

      {/* Report Content */}
      {report && !loading && !error && (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <MetricsCards metrics={report.metrics} />

          {/* Charts */}
          {report.metrics.total_runs > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DispositionChart data={report.disposition_distribution} />
                <DurationChart data={report.call_duration_distribution} />
              </div>

              {/* Live Daily Call Runs Detail Table */}
              {runsDetail.length > 0 && (
                <div className="p-5 rounded-xl border border-border/60 bg-card/30 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <PhoneCall className="w-3.5 h-3.5 text-cta" />
                      Workflow Call Runs Log ({format(selectedDate, 'MMM dd, yyyy')})
                    </h3>
                    <span className="text-[11px] text-muted-foreground">{runsDetail.length} calls recorded</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Phone Number</th>
                          <th className="py-2.5 px-3">Disposition</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3 text-right">Inspect Run</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {runsDetail.map((run: WorkflowRunDetail) => {
                          const contact = formatContactOrigin(run.phone_number);
                          const { label: dispLabel, className: dispClass } = getDispositionBadge(run.disposition);

                          return (
                            <tr key={run.run_id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-3 font-medium text-foreground">{contact}</td>
                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${dispClass}`}>
                                  {dispLabel}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-muted-foreground">{run.duration_seconds}s</td>
                              <td className="py-3 px-3 text-right">
                                <Link
                                  href={`/workflow/${run.workflow_id}/run/${run.run_id}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-cta hover:underline"
                                >
                                  View Log <ArrowUpRight className="w-3 h-3" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full py-12">
              <div className="flex flex-col items-center justify-center text-center py-12 px-6 max-w-md w-full border border-border/60 bg-card/30 rounded-xl shadow-xs space-y-2">
                <Calendar className="w-8 h-8 text-muted-foreground/40 mb-1" />
                <h3 className="text-xs font-bold text-foreground">No Call Data Available</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  No workflow runs were recorded for {format(selectedDate, 'MMMM dd, yyyy')}
                  {selectedWorkflow !== 'all' && ' for the selected workflow'}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
