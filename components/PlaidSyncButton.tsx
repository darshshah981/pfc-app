'use client';

import { useState, useCallback } from 'react';

interface PlaidSyncButtonProps {
  onSync?: () => void;
  className?: string;
}

interface SyncResult {
  accountsCreated: number;
  accountsUpdated: number;
  transactionsCreated: number;
  transactionsSkipped: number;
  errors: string[];
}

/**
 * PlaidSyncButton - A button that triggers a manual sync from Plaid.
 *
 * Calls POST /api/plaid/sync to fetch the latest accounts and transactions
 * from all linked Plaid items.
 */
export default function PlaidSyncButton({ onSync, className }: PlaidSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/plaid/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      setResult(data);

      // Call the callback after successful sync
      onSync?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync');
    } finally {
      setLoading(false);
    }
  }, [onSync]);

  const defaultClassName =
    'rounded-xl border border-warm-100 bg-white px-4 py-2.5 text-sm font-medium text-warm-700 shadow-sm transition-all hover:border-sage-200 hover:bg-sage-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-100 dark:hover:border-sage-700 dark:hover:bg-warm-700';

  return (
    <div className="inline-flex flex-col items-start">
      <button
        onClick={handleSync}
        disabled={loading}
        className={className || defaultClassName}
      >
        {loading ? 'Syncing...' : 'Sync from Plaid'}
      </button>

      {error && <p className="mt-2 text-sm text-coral-500">{error}</p>}

      {result && (
        <p className="mt-2 text-sm text-moss-600 dark:text-moss-400">
          Synced: {result.accountsCreated} new accounts, {result.transactionsCreated} new
          transactions
          {result.errors.length > 0 && ` (${result.errors.length} errors)`}
        </p>
      )}
    </div>
  );
}
