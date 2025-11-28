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

interface CategoryRollup {
  category: string;
  totalAmount: number;
  transactionCount: number;
}

function computeCategoryRollups(accounts: AccountSummary[]): CategoryRollup[] {
  const categoryMap = new Map<string, { totalAmount: number; transactionCount: number }>();

  for (const account of accounts) {
    for (const tx of account.transactions) {
      const category = tx.normalizedCategory || 'Uncategorized';
      const existing = categoryMap.get(category) || { totalAmount: 0, transactionCount: 0 };
      categoryMap.set(category, {
        totalAmount: existing.totalAmount + tx.amount,
        transactionCount: existing.transactionCount + 1,
      });
    }
  }

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      totalAmount: Math.round(data.totalAmount * 100) / 100,
      transactionCount: data.transactionCount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export default function SpendSummary() {
  const [period, setPeriod] = useState<Period>('current_month');
  const [sharedOnly, setSharedOnly] = useState(false);
  const [expandedAccountIds, setExpandedAccountIds] = useState<Set<string>>(new Set());
  const [categoryRollupExpanded, setCategoryRollupExpanded] = useState(false);
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
            <label className="text-sm font-medium text-warm-600 dark:text-warm-300">
              Period:
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-xl border border-warm-100 bg-white px-3 py-1.5 text-sm text-warm-800 shadow-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 dark:border-warm-600 dark:bg-warm-800 dark:text-warm-100"
            >
              <option value="current_month">Current Month</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>

          {/* Date Range Display */}
          {data && (
            <span className="text-sm text-warm-500 dark:text-warm-400">
              {formatDateRange()}
            </span>
          )}
        </div>

        {/* Right side - Shared Only Toggle */}
        <label className="flex cursor-pointer items-center gap-2">
          <span className="text-sm font-medium text-warm-600 dark:text-warm-300">
            Shared Only:
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={sharedOnly}
            aria-label="Toggle shared only"
            onClick={() => setSharedOnly(!sharedOnly)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 ${
              sharedOnly ? 'bg-sage-500' : 'bg-warm-200 dark:bg-warm-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                sharedOnly ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>


      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center shadow-sm dark:border-warm-700 dark:bg-warm-800">
          <p className="text-warm-500 dark:text-warm-400">Loading spend summary...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-coral-100 bg-coral-50 p-4 text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-500">
          {error}
        </div>
      )}

      {/* Summary Content */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Total Spend Card */}
          <div className="rounded-2xl border border-warm-100 bg-white p-6 shadow-sm dark:border-warm-700 dark:bg-warm-800">
            <p className="text-sm font-medium text-warm-500 dark:text-warm-400">
              Total Spend {sharedOnly && '(Shared)'}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-warm-800 dark:text-warm-50">
              {formatCurrency(data.totalAmount)}
            </p>
            <p className="mt-1 text-sm text-warm-500 dark:text-warm-400">
              {data.accounts.reduce((sum, acc) => sum + acc.transactionCount, 0)} transactions
              {` across ${data.accounts.length} account${data.accounts.length !== 1 ? 's' : ''}`}
            </p>

            {/* Category Rollup */}
            {(() => {
              const categoryRollups = computeCategoryRollups(data.accounts);
              if (categoryRollups.length === 0) return null;

              return (
                <div className="mt-4 border-t border-warm-100 pt-3 dark:border-warm-700">
                  <button
                    type="button"
                    onClick={() => setCategoryRollupExpanded(!categoryRollupExpanded)}
                    aria-expanded={categoryRollupExpanded}
                    className="flex w-full items-center justify-between text-xs text-warm-500 hover:text-warm-700 dark:text-warm-400 dark:hover:text-warm-300"
                  >
                    <span className="font-medium">
                      {categoryRollups.length} categor{categoryRollups.length !== 1 ? 'ies' : 'y'}
                    </span>
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        categoryRollupExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {categoryRollupExpanded && (
                    <div className="mt-2 max-h-32 space-y-1.5 overflow-y-auto">
                      {categoryRollups.map((rollup) => (
                        <div
                          key={rollup.category}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              data-testid="category-name"
                              className="font-medium text-warm-700 dark:text-warm-200"
                            >
                              {rollup.category}
                            </span>
                            <span className="text-warm-400 dark:text-warm-500">
                              {rollup.transactionCount} transaction{rollup.transactionCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="font-medium text-warm-800 dark:text-warm-100">
                            {formatCurrency(rollup.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Account Accordion */}
          {data.accounts.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-warm-100 bg-white shadow-sm dark:border-warm-700 dark:bg-warm-800">
              <div className="border-b border-warm-100 bg-warm-50 px-4 py-3 dark:border-warm-700 dark:bg-warm-700/50">
                <h3 className="text-sm font-medium text-warm-700 dark:text-warm-200">
                  Spend by Account
                </h3>
                <p className="mt-0.5 text-xs text-warm-500 dark:text-warm-400">
                  Click an account to view and edit transactions
                </p>
              </div>
              <div className="divide-y divide-warm-100 dark:divide-warm-700">
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
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-warm-50 focus:bg-warm-50 focus:outline-none dark:hover:bg-warm-700/50 dark:focus:bg-warm-700/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-warm-800 dark:text-warm-100">
                                {account.accountName}
                              </p>
                              {account.isSharedSource && (
                                <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700 dark:bg-sage-800/50 dark:text-sage-300">
                                  Shared Source
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-warm-500 dark:text-warm-400">
                              {account.type || 'Unknown'} • {account.subtype || 'N/A'} •{' '}
                              {account.transactionCount} transaction
                              {account.transactionCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="ml-4 flex items-center gap-3">
                            <p className="text-lg font-semibold text-warm-800 dark:text-warm-100">
                              {formatCurrency(account.totalAmount)}
                            </p>
                            <svg
                              className={`h-5 w-5 text-warm-400 transition-transform ${
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
                          <div className="border-t border-warm-100 bg-warm-50/50 dark:border-warm-700 dark:bg-warm-800/50">
                            {account.transactions.length === 0 ? (
                              <p className="px-4 py-6 text-center text-sm text-warm-500 dark:text-warm-400">
                                No transactions for this account
                              </p>
                            ) : (
                              <div className="divide-y divide-warm-100 dark:divide-warm-700">
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
                                          <p className="font-medium text-warm-800 dark:text-warm-100">
                                            {tx.description}
                                          </p>
                                          <p className="text-sm text-warm-500 dark:text-warm-400">
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
                                            className="rounded-lg border border-warm-200 bg-white px-2 py-1 text-sm text-warm-800 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-warm-600 dark:bg-warm-700 dark:text-warm-100"
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
                                              className="h-4 w-4 cursor-pointer rounded border-warm-300 text-sage-500 focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-warm-600 dark:bg-warm-700"
                                            />
                                            <span className="text-xs text-warm-500 dark:text-warm-400">
                                              Shared
                                            </span>
                                          </label>

                                          {/* Amount */}
                                          <p className="min-w-[80px] text-right text-lg font-semibold text-warm-800 dark:text-warm-100">
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
            <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center shadow-sm dark:border-warm-700 dark:bg-warm-800">
              <p className="text-warm-500 dark:text-warm-400">
                No transactions found for this period.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
