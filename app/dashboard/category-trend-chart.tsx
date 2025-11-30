'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { CategoryTrendResponse, MonthlySpend } from '@/app/api/category-trend/route';

export interface SelectedMonth {
  monthIndex: number;
  year: number;
  month: string; // display name
}

interface CategoryTrendChartProps {
  category: string;
  selectedMonth: SelectedMonth | null;
  onMonthSelect: (month: SelectedMonth) => void;
}

export default function CategoryTrendChart({
  category,
  selectedMonth,
  onMonthSelect
}: CategoryTrendChartProps) {
  const [data, setData] = useState<MonthlySpend[]>([]);
  const [budgetLimit, setBudgetLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrendData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/category-trend?category=${encodeURIComponent(category)}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch trend data');
        }
        const result: CategoryTrendResponse = await response.json();
        setData(result.monthlySpending);
        setBudgetLimit(result.budgetLimit);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTrendData();
  }, [category]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${Math.round(amount)}`;
  };

  if (loading) {
    return (
      <div className="h-[100px] bg-warm-50 rounded-xl animate-pulse dark:bg-warm-700/50" />
    );
  }

  if (error) {
    return null; // Silently fail - don't show error for optional chart
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.map((d) => d.amount),
    budgetLimit || 0
  );

  // If no spending data, don't show the chart
  if (maxValue === 0) {
    return null;
  }

  const handleBarClick = (entry: MonthlySpend) => {
    onMonthSelect({
      monthIndex: entry.monthIndex,
      year: entry.year,
      month: entry.month,
    });
  };

  const isSelected = (entry: MonthlySpend) => {
    if (!selectedMonth) return entry.isCurrentMonth;
    return entry.monthIndex === selectedMonth.monthIndex && entry.year === selectedMonth.year;
  };

  return (
    <div className="mb-6">
      <p className="text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400 mb-2">
        3-Month Trend <span className="font-normal">(click to view)</span>
      </p>
      <div className="h-[100px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
          >
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fill: '#78716c', // warm-500
              }}
              dy={8}
            />
            {/* Budget limit reference line */}
            {budgetLimit && (
              <ReferenceLine
                y={budgetLimit}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: formatCurrency(budgetLimit),
                  position: 'right',
                  fontSize: 10,
                  fill: '#ef4444',
                }}
              />
            )}
            <Bar
              dataKey="amount"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              cursor="pointer"
              onClick={(_, index) => handleBarClick(data[index])}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={isSelected(entry) ? '#6366f1' : '#d1d5db'}
                  className={isSelected(entry) ? '' : 'dark:fill-warm-600'}
                  style={{
                    filter: isSelected(entry) ? 'none' : 'opacity(0.7)',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
          <span className="text-[10px] text-warm-500 dark:text-warm-400">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-warm-600" />
          <span className="text-[10px] text-warm-500 dark:text-warm-400">Other months</span>
        </div>
        {budgetLimit && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t-2 border-dashed border-red-500" />
            <span className="text-[10px] text-warm-500 dark:text-warm-400">Budget</span>
          </div>
        )}
      </div>
    </div>
  );
}
