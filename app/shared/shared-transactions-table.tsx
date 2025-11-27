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
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Merchant
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Category
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Shared
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Account
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatDate(tx.date)}
                </td>
                <td className="px-4 py-3 text-sm text-black dark:text-white">
                  {tx.merchant_name || '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-black dark:text-white">
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
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-black focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
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
                    className={`inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                      tx.is_shared
                        ? 'bg-blue-600'
                        : 'bg-zinc-300 dark:bg-zinc-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        tx.is_shared ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {tx.account_name || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </span>
          <span className="font-medium text-black dark:text-white">
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
