'use client';

import { useState, useEffect, useCallback } from 'react';

type Period = 'current_month' | 'last_30_days';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  normalizedCategory: string | null;
  isShared: boolean;
}

interface AccountSummary {
  accountId: string;
  accountName: string;
  type: string | null;
  subtype: string | null;
  isSharedSource: boolean;
  totalAmount: number;
  transactionCount: number;
  transactions: Transaction[];
}

interface SpendSummaryData {
  startDate: string;
  endDate: string;
  period: Period;
  sharedOnly: boolean;
  totalAmount: number;
  accounts: AccountSummary[];
  categories: string[];
}

export default function SpendSummary() {
  const [period, setPeriod] = useState<Period>('current_month');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [expandedAccountIds, setExpandedAccountIds] = useState<Set<string>>(new Set());
  const [data, setData] = useState<SpendSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTransactions, setUpdatingTransactions] = useState<Set<string>>(new Set());

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

  const toggleAccountExpanded = useCallback((accountId: string) => {
    setExpandedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const updateTransaction = useCallback(
    async (
      transactionId: string,
      updates: { isShared?: boolean; normalizedCategory?: string | null }
    ) => {
      if (!data) return;

      // Track that this transaction is being updated
      setUpdatingTransactions((prev) => new Set(prev).add(transactionId));

      // Optimistic update
      const previousData = data;
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          accounts: current.accounts.map((account) => ({
            ...account,
            transactions: account.transactions.map((tx) =>
              tx.id === transactionId
                ? {
                    ...tx,
                    ...(updates.isShared !== undefined && { isShared: updates.isShared }),
                    ...(updates.normalizedCategory !== undefined && {
                      normalizedCategory: updates.normalizedCategory,
                    }),
                  }
                : tx
            ),
          })),
        };
      });

      try {
        const response = await fetch(`/api/transactions/${transactionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_shared: updates.isShared,
            normalized_category: updates.normalizedCategory,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update transaction');
        }
      } catch {
        // Rollback on error
        setData(previousData);
      } finally {
        setUpdatingTransactions((prev) => {
          const next = new Set(prev);
          next.delete(transactionId);
          return next;
        });
      }
    },
    [data]
  );

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


  return (
    <div>
      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left side - Period Selector and Date Range */}
        <div className="flex items-center gap-4">
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

          {/* Date Range Display */}
          {data && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatDateRange()}
            </span>
          )}
        </div>

        {/* Right side - Shared Only Toggle */}
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
              {` across ${data.accounts.length} account${data.accounts.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Account Accordion */}
          {data.accounts.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Spend by Account
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Click an account to view and edit transactions
                </p>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.accounts
                  .sort((a, b) => b.totalAmount - a.totalAmount)
                  .map((account) => {
                    const isExpanded = expandedAccountIds.has(account.accountId);

                    return (
                      <div key={account.accountId}>
                        {/* Account Header */}
                        <button
                          onClick={() => toggleAccountExpanded(account.accountId)}
                          aria-expanded={isExpanded}
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-black dark:text-white">
                                {account.accountName}
                              </p>
                              {account.isSharedSource && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  Shared Source
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {account.type || 'Unknown'} • {account.subtype || 'N/A'} •{' '}
                              {account.transactionCount} transaction
                              {account.transactionCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="ml-4 flex items-center gap-3">
                            <p className="text-lg font-semibold text-black dark:text-white">
                              {formatCurrency(account.totalAmount)}
                            </p>
                            <svg
                              className={`h-5 w-5 text-zinc-400 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
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

                        {/* Expanded Transaction List */}
                        {isExpanded && (
                          <div className="border-t border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
                            {account.transactions.length === 0 ? (
                              <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                No transactions for this account
                              </p>
                            ) : (
                              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {account.transactions
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .map((tx) => {
                                    const isUpdating = updatingTransactions.has(tx.id);

                                    return (
                                      <div
                                        key={tx.id}
                                        className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                                          isUpdating ? 'opacity-50' : ''
                                        }`}
                                      >
                                        {/* Transaction Info */}
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-black dark:text-white">
                                            {tx.description}
                                          </p>
                                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {formatDate(tx.date)}
                                          </p>
                                        </div>

                                        {/* Transaction Controls */}
                                        <div className="flex flex-wrap items-center gap-3">
                                          {/* Category Dropdown */}
                                          <select
                                            value={tx.normalizedCategory || ''}
                                            onChange={(e) =>
                                              updateTransaction(tx.id, {
                                                normalizedCategory: e.target.value || null,
                                              })
                                            }
                                            disabled={isUpdating}
                                            aria-label={`Category for ${tx.description}`}
                                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                                          >
                                            <option value="">No category</option>
                                            {data.categories.map((cat) => (
                                              <option key={cat} value={cat}>
                                                {cat}
                                              </option>
                                            ))}
                                          </select>

                                          {/* Shared Checkbox */}
                                          <label className="flex cursor-pointer items-center gap-1.5">
                                            <input
                                              type="checkbox"
                                              checked={tx.isShared}
                                              aria-label={`Mark ${tx.description} as shared`}
                                              disabled={isUpdating}
                                              onChange={() =>
                                                updateTransaction(tx.id, {
                                                  isShared: !tx.isShared,
                                                })
                                              }
                                              className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800"
                                            />
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                              Shared
                                            </span>
                                          </label>

                                          {/* Amount */}
                                          <p className="min-w-[80px] text-right text-lg font-semibold text-black dark:text-white">
                                            {formatCurrency(tx.amount)}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Empty State (no accounts) */}
          {data.accounts.length === 0 && (
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
