'use client';

import { useState, useEffect } from 'react';

type Period = 'current_month' | 'last_30_days';

interface AccountSummary {
  accountId: string;
  accountName: string;
  type: string | null;
  subtype: string | null;
  totalAmount: number;
  transactionCount: number;
}

interface SpendSummaryData {
  startDate: string;
  endDate: string;
  period: Period;
  sharedOnly: boolean;
  totalAmount: number;
  accounts: AccountSummary[];
}

export default function SpendSummary() {
  const [period, setPeriod] = useState<Period>('current_month');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [data, setData] = useState<SpendSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          period,
          sharedOnly: sharedOnly.toString(),
        });

        const response = await fetch(`/api/spend-summary?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch spend summary');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [period, sharedOnly]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateRange = () => {
    if (!data) return '';

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    end.setDate(end.getDate() - 1); // Make end inclusive for display

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }

    return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
  };

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Period:
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          >
            <option value="current_month">Current Month</option>
            <option value="last_30_days">Last 30 Days</option>
          </select>
        </div>

        {/* Shared Only Toggle */}
        <label className="flex cursor-pointer items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Shared Only:
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={sharedOnly}
            onClick={() => setSharedOnly(!sharedOnly)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              sharedOnly ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                sharedOnly ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        {/* Date Range Display */}
        {data && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatDateRange()}
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">Loading spend summary...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary Content */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Total Spend Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total Spend {sharedOnly && '(Shared)'}
            </p>
            <p className="mt-1 text-3xl font-bold text-black dark:text-white">
              {formatCurrency(data.totalAmount)}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {data.accounts.reduce((sum, acc) => sum + acc.transactionCount, 0)} transactions
              across {data.accounts.length} account{data.accounts.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Account Breakdown */}
          {data.accounts.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Spend by Account
                </h3>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.accounts
                  .sort((a, b) => b.totalAmount - a.totalAmount)
                  .map((account) => {
                    const percentage =
                      data.totalAmount > 0
                        ? (account.totalAmount / data.totalAmount) * 100
                        : 0;

                    return (
                      <div
                        key={account.accountId}
                        className="flex items-center justify-between p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-black dark:text-white">
                            {account.accountName}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {account.type || 'Unknown'} • {account.subtype || 'N/A'} •{' '}
                            {account.transactionCount} transaction
                            {account.transactionCount !== 1 ? 's' : ''}
                          </p>
                          {/* Progress Bar */}
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-lg font-semibold text-black dark:text-white">
                            {formatCurrency(account.totalAmount)}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">
                No transactions found for this period.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
