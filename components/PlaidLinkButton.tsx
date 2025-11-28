'use client';

import { useState, useCallback } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  className?: string;
  isConnected?: boolean;
  connectedCount?: number;
}

/**
 * PlaidLinkButton - A button that initiates the Plaid Link flow.
 *
 * Flow:
 * 1. User clicks button
 * 2. We fetch a link_token from /api/plaid/create-link-token
 * 3. Plaid Link opens with the token
 * 4. User completes bank connection in Plaid's UI
 * 5. On success, we send the public_token to /api/plaid/exchange-public-token
 * 6. Backend stores the access_token, and we call onSuccess callback
 */
export default function PlaidLinkButton({ onSuccess, className, isConnected = false, connectedCount = 0 }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch link token from our API
  const fetchLinkToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create link token');
      }

      setLinkToken(data.link_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Plaid Link');
      setLoading(false);
    }
  }, []);

  // Handle successful Plaid Link completion
  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/plaid/exchange-public-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to exchange token');
        }

        // Reset state
        setLinkToken(null);
        setLoading(false);

        // Call success callback
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link account');
        setLoading(false);
      }
    },
    [onSuccess]
  );

  // Plaid Link configuration
  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: () => {
      // User closed Plaid Link without completing
      setLinkToken(null);
      setLoading(false);
    },
  };

  const { open, ready } = usePlaidLink(config);

  // When link token is ready, open Plaid Link
  const handleClick = useCallback(async () => {
    if (linkToken && ready) {
      open();
    } else {
      await fetchLinkToken();
    }
  }, [linkToken, ready, open, fetchLinkToken]);

  // Open Plaid Link when token becomes available
  // We use an effect to open once token is ready
  const shouldOpen = linkToken && ready && loading;
  if (shouldOpen) {
    open();
    setLoading(false);
  }

  const defaultClassName =
    'rounded-xl border border-sage-200 bg-sage-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-sage-600 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-sage-700 dark:bg-sage-600 dark:hover:bg-sage-500';

  const buttonText = loading
    ? 'Connecting...'
    : isConnected
      ? `${connectedCount} Account${connectedCount !== 1 ? 's' : ''} Connected`
      : 'Connect Bank Account';

  return (
    <div className="inline-flex flex-col items-start">
      <button
        onClick={handleClick}
        disabled={loading}
        className={className || defaultClassName}
      >
        {buttonText}
      </button>
      {error && <p className="mt-2 text-sm text-coral-500">{error}</p>}
    </div>
  );
}
