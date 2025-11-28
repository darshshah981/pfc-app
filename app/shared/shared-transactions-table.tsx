'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const CATEGORIES = ['RESTAURANTS', 'GROCERY', 'TRAVEL', 'OTHER'];

interface SharedTransaction {
  id: string;
  date: string;
  amount: number;
  merchant_name: string | null;
  normalized_category: string | null;
  is_shared: boolean;
  account_name: string | null;
}

interface SharedTransactionsTableProps {
  transactions: SharedTransaction[];
}

export default function SharedTransactionsTable({
  transactions,
}: SharedTransactionsTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const updateTransaction = async (
    transactionId: string,
    updates: { is_shared?: boolean; normalized_category?: string }
  ) => {
    setLoading(transactionId);

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction');
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-warm-100 bg-white shadow-sm dark:border-warm-700 dark:bg-warm-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-warm-100 bg-warm-50 dark:border-warm-700 dark:bg-warm-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-warm-700 dark:text-warm-200">
                Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-warm-700 dark:text-warm-200">
                Merchant
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-warm-700 dark:text-warm-200">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-warm-700 dark:text-warm-200">
                Category
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-warm-700 dark:text-warm-200">
                Shared
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-warm-700 dark:text-warm-200">
                Account
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100 dark:divide-warm-700">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="transition-colors hover:bg-warm-50 dark:hover:bg-warm-700/30"
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm text-warm-500 dark:text-warm-400">
                  {formatDate(tx.date)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-warm-800 dark:text-warm-100">
                  {tx.merchant_name || '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-warm-800 dark:text-warm-100">
                  {formatAmount(tx.amount)}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={tx.normalized_category || ''}
                    onChange={(e) =>
                      updateTransaction(tx.id, {
                        normalized_category: e.target.value,
                      })
                    }
                    disabled={loading === tx.id}
                    className="w-full rounded-lg border border-warm-200 bg-white px-2 py-1 text-sm text-warm-800 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 disabled:opacity-50 dark:border-warm-600 dark:bg-warm-700 dark:text-warm-100"
                  >
                    <option value="">Select...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() =>
                      updateTransaction(tx.id, { is_shared: !tx.is_shared })
                    }
                    disabled={loading === tx.id}
                    className={`inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 disabled:opacity-50 ${
                      tx.is_shared
                        ? 'bg-sage-500'
                        : 'bg-warm-200 dark:bg-warm-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        tx.is_shared ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-warm-500 dark:text-warm-400">
                  {tx.account_name || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-warm-100 bg-warm-50 px-4 py-3 dark:border-warm-700 dark:bg-warm-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-warm-500 dark:text-warm-400">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </span>
          <span className="font-semibold text-warm-800 dark:text-warm-100">
            Total:{' '}
            {formatAmount(
              transactions.reduce((sum, tx) => sum + tx.amount, 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
