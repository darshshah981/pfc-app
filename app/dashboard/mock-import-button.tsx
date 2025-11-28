'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MockImportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    accountsCreated: number;
    transactionsCreated: number;
    accountsReused: number;
    transactionsSkipped: number;
  } | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/mock-import', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to import mock data');
      }

      const data = await response.json();
      setResult(data);

      // Refresh the page after a short delay to show the result
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error('Error importing mock data:', error);
      alert('Failed to import mock data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleImport}
        disabled={loading}
        className="rounded-xl border border-dashed border-warm-200 bg-warm-50 px-4 py-2.5 text-sm font-medium text-warm-500 transition-all hover:border-sage-300 hover:bg-sage-50 hover:text-sage-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-warm-600 dark:bg-warm-800 dark:text-warm-400 dark:hover:border-sage-600 dark:hover:bg-warm-700"
      >
        {loading ? 'Importing...' : 'Import Mock Data'}
      </button>

      {result && (
        <span className="text-sm text-moss-500 dark:text-sage-400">
          +{result.accountsCreated} accounts, +{result.transactionsCreated} transactions
          {result.transactionsSkipped > 0 && ` (${result.transactionsSkipped} skipped)`}
        </span>
      )}
    </div>
  );
}
