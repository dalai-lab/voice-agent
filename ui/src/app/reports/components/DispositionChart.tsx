'use client';

import { PieChart } from 'lucide-react';
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
        <div className="bg-[#171717] border border-[#333] rounded-lg shadow-lg p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground">{item.disposition}</p>
          <p className="text-muted-foreground">Count: <span className="text-foreground font-mono">{item.count}</span></p>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="disposition"
                angle={-35}
                textAnchor="end"
                interval={0}
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
