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

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  isShared: boolean;
}

interface SpendSummaryData {
  startDate: string;
  endDate: string;
  period: Period;
  sharedOnly: boolean;
  accountId: string | null;
  totalAmount: number;
  accounts: AccountSummary[];
  transactions?: Transaction[];
}

export default function SpendSummary() {
  const [period, setPeriod] = useState<Period>('current_month');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
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

        if (selectedAccountId) {
          params.set('accountId', selectedAccountId);
        }

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
  }, [period, sharedOnly, selectedAccountId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateRange = () => {
    if (!data) return '';

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    end.setDate(end.getDate() - 1);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }

    return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
  };

  const handleAccountClick = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const handleClearSelection = () => {
    setSelectedAccountId(null);
  };

  const selectedAccount = data?.accounts.find(
    (acc) => acc.accountId === selectedAccountId
  );

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
            aria-label="Toggle shared only"
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

      {/* Selected Account Header */}
      {selectedAccountId && selectedAccount && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Viewing transactions for:
            </p>
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              {selectedAccount.accountName}
            </p>
          </div>
          <button
            onClick={handleClearSelection}
            aria-label="Clear selection"
            className="rounded-md bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700"
          >
            ← Back to Summary
          </button>
        </div>
      )}

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
              {selectedAccountId && ' (Filtered)'}
            </p>
            <p className="mt-1 text-3xl font-bold text-black dark:text-white">
              {formatCurrency(data.totalAmount)}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {data.accounts.reduce((sum, acc) => sum + acc.transactionCount, 0)} transactions
              {!selectedAccountId && ` across ${data.accounts.length} account${data.accounts.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Account Breakdown (when no account is selected) */}
          {!selectedAccountId && data.accounts.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Spend by Account
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Click an account to view transactions
                </p>
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
                      <button
                        key={account.accountId}
                        onClick={() => handleAccountClick(account.accountId)}
                        aria-pressed={selectedAccountId === account.accountId}
                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
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
                        <div className="ml-4 flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-black dark:text-white">
                              {formatCurrency(account.totalAmount)}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                          <svg
                            className="h-5 w-5 text-zinc-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Transaction List (when account is selected) */}
          {selectedAccountId && data.transactions && data.transactions.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Transactions ({data.transactions.length})
                </h3>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-black dark:text-white">
                          {tx.description}
                        </p>
                        {tx.isShared && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Shared
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDate(tx.date)}
                      </p>
                    </div>
                    <p className="ml-4 text-lg font-semibold text-black dark:text-white">
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Transaction State */}
          {selectedAccountId && (!data.transactions || data.transactions.length === 0) && (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">
                No transactions found for this account in the selected period.
              </p>
            </div>
          )}

          {/* Empty State (no accounts) */}
          {!selectedAccountId && data.accounts.length === 0 && (
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
