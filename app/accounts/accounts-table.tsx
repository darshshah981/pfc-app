'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Account {
  id: string;
  name: string;
  type: string | null;
  subtype: string | null;
  is_shared_source: boolean;
  provider_account_id: string;
  created_at: string;
}

interface AccountsTableProps {
  accounts: Account[];
}

export default function AccountsTable({ accounts }: AccountsTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const toggleSharedSource = async (accountId: string, currentValue: boolean) => {
    setLoading(accountId);

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_shared_source: !currentValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-warm-100 bg-white shadow-sm dark:border-warm-700 dark:bg-warm-800">
      <table className="w-full">
        <thead className="border-b border-warm-100 bg-warm-50 dark:border-warm-700 dark:bg-warm-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-warm-700 dark:text-warm-200">
              Account Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-warm-700 dark:text-warm-200">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-warm-700 dark:text-warm-200">
              Subtype
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-warm-700 dark:text-warm-200">
              Shared Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-warm-100 dark:divide-warm-700">
          {accounts.map((account) => (
            <tr key={account.id} className="transition-colors hover:bg-warm-50 dark:hover:bg-warm-700/30">
              <td className="px-4 py-3 text-sm font-medium text-warm-800 dark:text-warm-100">
                {account.name}
              </td>
              <td className="px-4 py-3 text-sm text-warm-500 dark:text-warm-400">
                {account.type || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-warm-500 dark:text-warm-400">
                {account.subtype || '-'}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => toggleSharedSource(account.id, account.is_shared_source)}
                  disabled={loading === account.id}
                  className={`inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 disabled:opacity-50 ${
                    account.is_shared_source
                      ? 'bg-sage-500'
                      : 'bg-warm-200 dark:bg-warm-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      account.is_shared_source ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
