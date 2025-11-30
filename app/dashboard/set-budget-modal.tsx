'use client';

import { useState, useEffect } from 'react';

interface SetBudgetModalProps {
  category: string;
  currentLimit: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string, amount: number) => Promise<void>;
}

export default function SetBudgetModal({
  category,
  currentLimit,
  isOpen,
  onClose,
  onSave,
}: SetBudgetModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = currentLimit !== null;

  // Reset form when modal opens/closes or currentLimit changes
  useEffect(() => {
    if (isOpen) {
      setAmount(currentLimit ? currentLimit.toString() : '');
      setError(null);
    }
  }, [isOpen, currentLimit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setSaving(true);
      await onSave(category, numericAmount);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const weeklyEstimate = amount ? (parseFloat(amount) / 4.33).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-warm-200 bg-white p-6 shadow-xl dark:border-warm-700 dark:bg-warm-800">
        <h2 className="mb-1 text-lg font-semibold text-warm-800 dark:text-warm-100">
          {isEditing ? 'Edit Budget' : 'Set Budget'}
        </h2>
        <p className="mb-4 text-sm text-warm-500 dark:text-warm-400">
          {category}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="budget-amount"
              className="mb-1.5 block text-sm font-medium text-warm-700 dark:text-warm-200"
            >
              Monthly Limit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400">
                $
              </span>
              <input
                id="budget-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-warm-200 bg-white py-2.5 pl-7 pr-4 text-warm-800 placeholder-warm-400 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 dark:border-warm-600 dark:bg-warm-700 dark:text-warm-100 dark:placeholder-warm-500 dark:focus:border-sage-400 dark:focus:ring-sage-400"
                autoFocus
              />
            </div>
            <p className="mt-2 text-xs text-warm-500 dark:text-warm-400">
              Enter monthly limit. Weekly limit will be calculated automatically (~${weeklyEstimate}/week).
            </p>
            <p className="mt-1 text-xs text-warm-400 dark:text-warm-500 italic">
              Budgets are set monthly and automatically calculated for weekly views.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm font-medium text-warm-700 transition-colors hover:bg-warm-50 disabled:opacity-50 dark:border-warm-600 dark:bg-warm-700 dark:text-warm-200 dark:hover:bg-warm-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !amount}
              className="flex-1 rounded-lg bg-sage-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:opacity-50 dark:bg-sage-500 dark:hover:bg-sage-600"
            >
              {saving ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
