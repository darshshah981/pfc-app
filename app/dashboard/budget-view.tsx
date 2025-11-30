'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BudgetOverviewResponse, CategoryBudgetData } from '@/app/api/budget-overview/route';
import SetBudgetModal from './set-budget-modal';
import CategoryDrawer from './category-drawer';
import { upsertBudget, deleteBudget } from './actions';

type ViewMode = 'monthly' | 'weekly';

interface ModalState {
  isOpen: boolean;
  category: string;
  currentLimit: number | null;
}

interface DrawerState {
  isOpen: boolean;
  category: CategoryBudgetData | null;
}

export default function BudgetView() {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [data, setData] = useState<BudgetOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    category: '',
    currentLimit: null,
  });
  const [drawerState, setDrawerState] = useState<DrawerState>({
    isOpen: false,
    category: null,
  });

  const fetchBudgetData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/budget-overview');
      if (!response.ok) {
        throw new Error('Failed to fetch budget data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const handleSetBudget = (category: string, currentLimit: number | null) => {
    setModalState({
      isOpen: true,
      category,
      currentLimit,
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      category: '',
      currentLimit: null,
    });
  };

  const handleSaveBudget = async (category: string, amount: number) => {
    await upsertBudget(category, amount);
    // Refresh data after successful save
    await fetchBudgetData();
  };

  const handleDeleteBudget = async (category: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove the budget for "${category}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteBudget(category);
      await fetchBudgetData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete budget');
    }
  };

  const handleOpenDrawer = (category: CategoryBudgetData) => {
    setDrawerState({
      isOpen: true,
      category,
    });
  };

  const handleCloseDrawer = () => {
    setDrawerState({
      isOpen: false,
      category: null,
    });
  };

  const handleTransactionMoved = (
    _transactionId: string,
    amount: number,
    fromCategory: string,
    toCategory: string
  ) => {
    // Optimistically update the data to reflect the category change
    // When viewing weekly, we only show transactions within the week,
    // so the moved transaction affects both month and week totals
    setData((prevData) => {
      if (!prevData) return prevData;

      const updatedCategories = prevData.categories.map((cat) => {
        if (cat.category === fromCategory) {
          // Subtract from source category (both month and week since displayed tx is in both)
          return {
            ...cat,
            spendMonth: Math.max(0, Math.round((cat.spendMonth - amount) * 100) / 100),
            spendWeek: Math.max(0, Math.round((cat.spendWeek - amount) * 100) / 100),
          };
        }
        if (cat.category === toCategory) {
          // Add to destination category
          return {
            ...cat,
            spendMonth: Math.round((cat.spendMonth + amount) * 100) / 100,
            spendWeek: Math.round((cat.spendWeek + amount) * 100) / 100,
          };
        }
        return cat;
      });

      // Also update the drawer state if it's still open
      if (drawerState.category?.category === fromCategory) {
        const updatedDrawerCategory = updatedCategories.find(
          (c) => c.category === fromCategory
        );
        if (updatedDrawerCategory) {
          setDrawerState((prev) => ({
            ...prev,
            category: updatedDrawerCategory,
          }));
        }
      }

      return {
        ...prevData,
        categories: updatedCategories,
      };
    });
  };

  const getSpendAmount = (category: CategoryBudgetData): number => {
    return viewMode === 'monthly' ? category.spendMonth : category.spendWeek;
  };

  const getProgressPercent = (category: CategoryBudgetData): number | null => {
    if (!category.budgetLimitMonth) return null;
    const spend = getSpendAmount(category);
    const limit = viewMode === 'monthly'
      ? category.budgetLimitMonth
      : category.budgetLimitMonth / 4.33;
    return Math.min((spend / limit) * 100, 100);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateRange = (): string => {
    if (!data) return '';

    // Parse YYYY-MM-DD format and display in local timezone
    const formatDate = (dateString: string): string => {
      const [year, month, day] = dateString.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (viewMode === 'monthly') {
      return formatDate(data.currentMonthStart) + ' - ' + formatDate(data.currentMonthEnd);
    } else {
      // For weekly view, prefix with day range
      return `(Mon-Sun) ${formatDate(data.currentWeekStart)} - ${formatDate(data.currentWeekEnd)}`;
    }
  };

  const getDaysRemaining = (): number => {
    if (!data) return 0;
    const now = new Date();

    // Parse YYYY-MM-DD format
    const parseDateString = (dateString: string): Date => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const endDate = viewMode === 'monthly'
      ? parseDateString(data.currentMonthEnd)
      : parseDateString(data.currentWeekEnd);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTodayDisplay = (): string => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div>
      {/* Today's Date Banner */}
      <div className="mb-4 flex items-center justify-between rounded-xl bg-sage-50 px-4 py-2.5 dark:bg-sage-900/20">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sage-600 dark:text-sage-400">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span className="text-sm font-medium text-sage-700 dark:text-sage-300">
            Today: {getTodayDisplay()}
          </span>
        </div>
      </div>

      {/* View Toggle and Date Range */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-1 rounded-lg bg-warm-100 p-1 dark:bg-warm-800 w-fit">
          <button
            onClick={() => setViewMode('monthly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              viewMode === 'monthly'
                ? 'bg-white text-warm-800 shadow-sm dark:bg-warm-700 dark:text-warm-50'
                : 'text-warm-600 hover:text-warm-800 dark:text-warm-400 dark:hover:text-warm-200'
            }`}
          >
            Monthly View
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              viewMode === 'weekly'
                ? 'bg-white text-warm-800 shadow-sm dark:bg-warm-700 dark:text-warm-50'
                : 'text-warm-600 hover:text-warm-800 dark:text-warm-400 dark:hover:text-warm-200'
            }`}
          >
            Weekly View
          </button>
        </div>

        {/* Date Range and Days Remaining */}
        {data && (
          <div className="text-right">
            <p className="text-sm text-warm-600 dark:text-warm-300">
              {formatDateRange()}
            </p>
            <p className="text-xs text-warm-500 dark:text-warm-400">
              {daysRemaining === 0
                ? viewMode === 'monthly' ? 'Last day of the month' : 'Last day of the week'
                : daysRemaining === 1
                  ? '1 day remaining'
                  : `${daysRemaining} days remaining`}
            </p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center dark:border-warm-700 dark:bg-warm-800">
          <p className="text-warm-600 dark:text-warm-300">Loading budget data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <div className="space-y-4">
          {data.categories.length === 0 ? (
            <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center dark:border-warm-700 dark:bg-warm-800">
              <p className="text-warm-600 dark:text-warm-300">
                No spending data available for this period.
              </p>
            </div>
          ) : (
            data.categories.map((category) => {
              const spend = getSpendAmount(category);
              const progress = getProgressPercent(category);
              const isOverBudget = progress !== null && progress >= 100;
              const weeklyLimit = category.budgetLimitMonth
                ? category.budgetLimitMonth / 4.33
                : null;
              const displayLimit = viewMode === 'monthly'
                ? category.budgetLimitMonth
                : weeklyLimit;

              return (
                <div
                  key={category.category}
                  className="rounded-2xl border border-warm-100 bg-white p-4 dark:border-warm-700 dark:bg-warm-800 cursor-pointer hover:border-sage-200 hover:shadow-sm transition-all dark:hover:border-sage-700"
                  onClick={() => handleOpenDrawer(category)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-warm-800 dark:text-warm-100">
                        {category.category}
                      </h3>
                      {/* Chevron indicator */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warm-300 dark:text-warm-600">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Spend Amount and Limit */}
                      <div className="text-right">
                        <span className={`font-semibold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-warm-800 dark:text-warm-100'}`}>
                          {formatCurrency(spend)}
                        </span>
                        {category.hasBudget && displayLimit && (
                          <span className="text-warm-500 dark:text-warm-400">
                            {' '}/ {formatCurrency(displayLimit)}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {category.hasBudget ? (
                        <div className="flex items-center gap-1">
                          {/* Edit Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetBudget(category.category, category.budgetLimitMonth);
                            }}
                            className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-600 transition-colors dark:text-warm-500 dark:hover:bg-warm-700 dark:hover:text-warm-300"
                            title="Edit budget"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                              <path d="m15 5 4 4"/>
                            </svg>
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBudget(category.category);
                            }}
                            className="rounded-lg p-1.5 text-warm-400 hover:bg-red-50 hover:text-red-500 transition-colors dark:text-warm-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Remove budget"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"/>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              <line x1="10" x2="10" y1="11" y2="17"/>
                              <line x1="14" x2="14" y1="11" y2="17"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetBudget(category.category, null);
                          }}
                          className="rounded-lg border border-sage-200 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 transition-all hover:bg-sage-100 hover:border-sage-300 dark:border-sage-700 dark:bg-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/50"
                        >
                          Set Budget
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar - only show when budget exists */}
                  {category.hasBudget && progress !== null && (
                    <div className="h-2 bg-warm-100 rounded-full overflow-hidden dark:bg-warm-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverBudget
                            ? 'bg-red-500'
                            : progress > 75
                              ? 'bg-amber-500'
                              : 'bg-sage-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Set Budget Modal */}
      <SetBudgetModal
        category={modalState.category}
        currentLimit={modalState.currentLimit}
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBudget}
      />

      {/* Category Drill-Down Drawer */}
      {drawerState.category && data && (
        <CategoryDrawer
          isOpen={drawerState.isOpen}
          onClose={handleCloseDrawer}
          category={drawerState.category.category}
          viewMode={viewMode}
          spendAmount={getSpendAmount(drawerState.category)}
          budgetLimit={
            viewMode === 'monthly'
              ? drawerState.category.budgetLimitMonth
              : drawerState.category.budgetLimitMonth
                ? drawerState.category.budgetLimitMonth / 4.33
                : null
          }
          dateRange={{
            start: viewMode === 'monthly' ? data.currentMonthStart : data.currentWeekStart,
            end: viewMode === 'monthly' ? data.currentMonthEnd : data.currentWeekEnd,
          }}
          onTransactionMoved={handleTransactionMoved}
        />
      )}
    </div>
  );
}
