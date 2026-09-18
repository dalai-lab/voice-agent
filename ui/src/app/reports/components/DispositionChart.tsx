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
import { PieChart } from 'lucide-react';

interface DispositionData {
  disposition: string;
  count: number;
  percentage: number;
}

interface DispositionChartProps {
  data: DispositionData[];
}

const COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#64748B', // Slate
];

export function DispositionChart({ data }: DispositionChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DispositionData & { fill: string } }> }) => {
    if (active && payload && payload[0]) {
      const item = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg p-3 text-xs space-y-1">
          <p className="font-semibold text-white">{item.disposition}</p>
          <p className="text-zinc-300">Count: <span className="text-white font-mono">{item.count}</span></p>
          <p className="text-zinc-300"><span className="text-white font-semibold">{item.percentage}%</span> of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 rounded-xl border border-border/60 bg-card shadow-xs space-y-4 text-card-foreground">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <PieChart className="w-3.5 h-3.5 text-indigo-400" />
          Disposition Distribution
        </h3>
      </div>

      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs font-medium">
          No disposition data available for this range
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 45 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
              <XAxis
                dataKey="disposition"
                angle={-35}
                textAnchor="end"
                interval={0}
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                stroke="#52525b"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                stroke="#52525b"
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
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
