'use client';

import { useState, useEffect, useRef } from 'react';
import type { CategoryTransaction } from '@/app/api/category-transactions/route';
import { updateTransactionCategory } from './actions';
import type { SelectedMonth } from './category-trend-chart';

interface CategoryTransactionListProps {
  category: string;
  viewMode: 'monthly' | 'weekly';
  selectedMonth: SelectedMonth | null;
  onTransactionMoved: (transactionId: string, amount: number, newCategory: string) => void;
}

export default function CategoryTransactionList({
  category,
  viewMode,
  selectedMonth,
  onTransactionMoved,
}: CategoryTransactionListProps) {
  const [transactions, setTransactions] = useState<CategoryTransaction[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        let url = `/api/category-transactions?category=${encodeURIComponent(category)}&viewMode=${viewMode}`;

        // If a specific month is selected, add month/year params
        if (selectedMonth) {
          url += `&month=${selectedMonth.monthIndex}&year=${selectedMonth.year}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        const data = await response.json();
        setTransactions(data.transactions);
        setAllCategories(data.allCategories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [category, viewMode, selectedMonth]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEditingTxId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryChange = async (
    transaction: CategoryTransaction,
    newCategory: string
  ) => {
    if (newCategory === transaction.normalized_category) {
      setEditingTxId(null);
      return;
    }

    // Optimistically update UI
    const txId = transaction.id;
    const amount = transaction.amount;

    // Add to pending updates
    setPendingUpdates((prev) => new Set(prev).add(txId));

    // Remove from local list immediately
    setTransactions((prev) => prev.filter((tx) => tx.id !== txId));

    // Close dropdown
    setEditingTxId(null);

    // Notify parent to update totals
    onTransactionMoved(txId, amount, newCategory);

    try {
      await updateTransactionCategory(txId, newCategory);
    } catch (err) {
      // Rollback on error
      setTransactions((prev) => [...prev, transaction].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      alert(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setPendingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-warm-100 rounded-lg dark:bg-warm-700" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-warm-200 bg-warm-50/50 p-6 text-center dark:border-warm-600 dark:bg-warm-700/30">
        <p className="text-sm text-warm-500 dark:text-warm-400">
          No transactions in this category for the selected period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isEditing = editingTxId === tx.id;
        const isPending = pendingUpdates.has(tx.id);

        return (
          <div
            key={tx.id}
            className={`group relative flex items-center justify-between rounded-lg border border-warm-100 bg-white p-3 transition-all dark:border-warm-700 dark:bg-warm-800 ${
              isPending ? 'opacity-50' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-warm-800 dark:text-warm-100 truncate">
                {tx.merchant_name}
              </p>
              <p className="text-xs text-warm-500 dark:text-warm-400">
                {formatDate(tx.date)}
              </p>
            </div>

            <div className="flex items-center gap-2 ml-3">
              <span className="font-semibold text-warm-800 dark:text-warm-100 whitespace-nowrap">
                {formatCurrency(tx.amount)}
              </span>

              {/* Category Edit Button */}
              <div className="relative" ref={isEditing ? dropdownRef : undefined}>
                <button
                  onClick={() => setEditingTxId(isEditing ? null : tx.id)}
                  disabled={isPending}
                  className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-600 transition-colors dark:text-warm-500 dark:hover:bg-warm-700 dark:hover:text-warm-300 disabled:opacity-50"
                  title="Move to another category"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3L4 7l4 4" />
                    <path d="M4 7h16" />
                    <path d="m16 21 4-4-4-4" />
                    <path d="M20 17H4" />
                  </svg>
                </button>

                {/* Dropdown */}
                {isEditing && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-warm-200 bg-white shadow-lg dark:border-warm-600 dark:bg-warm-800">
                    <div className="p-2">
                      <p className="px-2 pb-2 text-xs font-medium text-warm-500 dark:text-warm-400 border-b border-warm-100 dark:border-warm-700 mb-1">
                        Move to category:
                      </p>
                      <div className="max-h-48 overflow-y-auto">
                        {allCategories
                          .filter((cat) => cat !== category)
                          .map((cat) => (
                            <button
                              key={cat}
                              onClick={() => handleCategoryChange(tx, cat)}
                              className="w-full rounded-md px-3 py-2 text-left text-sm text-warm-700 hover:bg-sage-50 hover:text-sage-700 transition-colors dark:text-warm-200 dark:hover:bg-sage-900/30 dark:hover:text-sage-300"
                            >
                              {cat}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
