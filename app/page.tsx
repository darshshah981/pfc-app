'use client';

import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  supabaseReachable: boolean;
}

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: HealthResponse = await response.json();
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health status');
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-4xl font-bold text-black dark:text-white">
          Health Check
        </h1>

        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {loading && (
            <p className="text-center text-zinc-600 dark:text-zinc-400">
              Checking health status...
            </p>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-red-700 dark:text-red-400">
                Error: {error}
              </p>
            </div>
          )}

          {health && (
            <pre className="overflow-auto rounded-md bg-zinc-100 p-4 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${
              loading
                ? 'bg-yellow-400'
                : health?.supabaseReachable
                ? 'bg-green-500'
                : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {loading
              ? 'Checking...'
              : health?.supabaseReachable
              ? 'Supabase Connected'
              : 'Supabase Unreachable'}
          </span>
        </div>
      </main>
    </div>
  );
}
