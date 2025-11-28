'use client';

import { useRouter } from 'next/navigation';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import PlaidSyncButton from '@/components/PlaidSyncButton';

interface PlaidActionsProps {
  isConnected?: boolean;
  connectedCount?: number;
}

/**
 * Client component wrapper for Plaid action buttons.
 * Needed because event handlers can't be passed from Server Components.
 */
export default function PlaidActions({ isConnected = false, connectedCount = 0 }: PlaidActionsProps) {
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <div className="mb-6 flex flex-wrap items-start gap-3">
      <PlaidLinkButton onSuccess={handleSuccess} isConnected={isConnected} connectedCount={connectedCount} />
      {isConnected && <PlaidSyncButton onSync={handleSuccess} />}
    </div>
  );
}
