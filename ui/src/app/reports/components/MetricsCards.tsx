import {Percent, Phone, PhoneForwarded } from 'lucide-react';

interface MetricsCardsProps {
  metrics: {
    total_runs: number;
    xfer_count: number;
  };
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const transferRate = metrics.total_runs > 0 ? ((metrics.xfer_count / metrics.total_runs) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="p-4 rounded-xl border border-border/60 bg-card/30 hover:bg-card/50 transition-all duration-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Workflow Runs</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.total_runs.toLocaleString()}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-cta/10 flex items-center justify-center text-cta border border-cta/15">
          <Phone className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border/60 bg-card/30 hover:bg-card/50 transition-all duration-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Transferred Calls</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.xfer_count.toLocaleString()}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/15">
          <PhoneForwarded className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border/60 bg-card/30 hover:bg-card/50 transition-all duration-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Transfer Rate</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{transferRate}%</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/15">
          <Percent className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  );
}
