'use client';

import { useEffect, useState } from 'react';
import CategoryTransactionList from './category-transaction-list';
import CategoryTrendChart, { type SelectedMonth } from './category-trend-chart';

interface CategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  viewMode: 'monthly' | 'weekly';
  spendAmount: number;
  budgetLimit: number | null;
  dateRange: {
    start: string;
    end: string;
  };
  onTransactionMoved: (transactionId: string, amount: number, fromCategory: string, toCategory: string) => void;
}

export default function CategoryDrawer({
  isOpen,
  onClose,
  category,
  viewMode,
  spendAmount,
  budgetLimit,
  dateRange,
  onTransactionMoved,
}: CategoryDrawerProps) {
  // Local spend amount that updates optimistically
  const [localSpendAmount, setLocalSpendAmount] = useState(spendAmount);
  // Selected month from the trend chart (null = current period from parent)
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth | null>(null);

  // Reset local amount and selected month when drawer opens with new data
  useEffect(() => {
    setLocalSpendAmount(spendAmount);
    setSelectedMonth(null); // Reset to current month when drawer opens
  }, [spendAmount, category]);

  const handleMonthSelect = (month: SelectedMonth) => {
    setSelectedMonth(month);
  };

  const handleTransactionMoved = (transactionId: string, amount: number, newCategory: string) => {
    // Update local spend amount immediately
    setLocalSpendAmount((prev) => Math.max(0, prev - amount));
    // Notify parent
    onTransactionMoved(transactionId, amount, category, newCategory);
  };
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Parse YYYY-MM-DD format and display in local timezone
  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const progressPercent = budgetLimit
    ? Math.min((localSpendAmount / budgetLimit) * 100, 100)
    : null;
  const isOverBudget = progressPercent !== null && progressPercent >= 100;
  const remaining = budgetLimit ? budgetLimit - localSpendAmount : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-warm-800 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-100 px-6 py-4 dark:border-warm-700">
          <div>
            <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-100">
              {category}
            </h2>
            <p className="text-sm text-warm-500 dark:text-warm-400">
              {viewMode === 'monthly' ? 'Monthly' : 'Weekly'} breakdown
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-warm-400 hover:bg-warm-100 hover:text-warm-600 transition-colors dark:text-warm-500 dark:hover:bg-warm-700 dark:hover:text-warm-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18"/>
              <line x1="6" x2="18" y1="6" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-73px)]">
          {/* 3-Month Trend Chart */}
          <CategoryTrendChart
            category={category}
            selectedMonth={selectedMonth}
            onMonthSelect={handleMonthSelect}
          />

          {/* Period Info */}
          <div className="mb-6 rounded-xl bg-warm-50 p-4 dark:bg-warm-700/50">
            <p className="text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400 mb-1">
              {selectedMonth ? 'Viewing' : 'Period'}
            </p>
            <p className="text-sm font-medium text-warm-700 dark:text-warm-200">
              {selectedMonth
                ? `${selectedMonth.month} ${selectedMonth.year}`
                : `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`}
            </p>
          </div>

          {/* Spending Summary */}
          <div className="mb-6">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400 mb-1">
                  Spent
                </p>
                <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-warm-800 dark:text-warm-100'}`}>
                  {formatCurrency(localSpendAmount)}
                </p>
              </div>
              {budgetLimit && (
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400 mb-1">
                    Budget
                  </p>
                  <p className="text-lg font-semibold text-warm-600 dark:text-warm-300">
                    {formatCurrency(budgetLimit)}
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {progressPercent !== null && (
              <div className="mt-3">
                <div className="h-3 bg-warm-100 rounded-full overflow-hidden dark:bg-warm-700">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverBudget
                        ? 'bg-red-500'
                        : progressPercent > 75
                          ? 'bg-amber-500'
                          : 'bg-sage-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-warm-500 dark:text-warm-400">
                  <span>{progressPercent.toFixed(0)}% used</span>
                  {remaining !== null && (
                    <span className={remaining < 0 ? 'text-red-500' : ''}>
                      {remaining >= 0
                        ? `${formatCurrency(remaining)} remaining`
                        : `${formatCurrency(Math.abs(remaining))} over budget`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="border-t border-warm-100 pt-6 dark:border-warm-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-warm-800 dark:text-warm-100">
                Transactions
              </h3>
              <p className="text-xs text-warm-500 dark:text-warm-400">
                Click <span className="inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-0.5"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg></span> to recategorize
              </p>
            </div>
            <CategoryTransactionList
              category={category}
              viewMode={viewMode}
              selectedMonth={selectedMonth}
              onTransactionMoved={handleTransactionMoved}
            />
          </div>
        </div>
      </div>
    </>
  );
}
