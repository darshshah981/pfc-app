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
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Account Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Subtype
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Shared Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <td className="px-4 py-3 text-sm text-black dark:text-white">
                {account.name}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {account.type || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {account.subtype || '-'}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => toggleSharedSource(account.id, account.is_shared_source)}
                  disabled={loading === account.id}
                  className={`inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    account.is_shared_source
                      ? 'bg-blue-600'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
