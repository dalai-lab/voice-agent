'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clock } from 'lucide-react';

interface DurationData {
  bucket: string;
  range_start: number;
  range_end: number | null;
  count: number;
  percentage: number;
}

interface DurationChartProps {
  data: DurationData[];
}

const COLORS = {
  '0-10': '#312e81',    // indigo-900
  '10-30': '#4338ca',   // indigo-700
  '30-60': '#4f46e5',   // indigo-600
  '60-120': '#6366f1',  // indigo-500
  '120-180': '#818cf8', // indigo-400
  '>180': '#a5b4fc',    // indigo-300
};

export function DurationChart({ data }: DurationChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: `${item.bucket}s`,
    fill: COLORS[item.bucket as keyof typeof COLORS] || '#6366f1',
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DurationData & { label: string; fill: string } }> }) => {
    if (active && payload && payload[0]) {
      const item = payload[0].payload;
      return (
        <div className="bg-[#171717] border border-[#333] rounded-lg shadow-lg p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground">{item.label}</p>
          <p className="text-muted-foreground">Calls: <span className="text-foreground font-mono">{item.count}</span></p>
          <p className="text-muted-foreground"><span className="text-foreground font-semibold">{item.percentage}%</span> of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 rounded-xl border border-border/60 bg-card/30 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          Call Duration Distribution
        </h3>
      </div>

      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs font-medium">
          No duration data available for this range
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#888' }}
                stroke="#333"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#888' }}
                stroke="#333"
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
