'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 dark:bg-warm-900">
      <div className="w-full max-w-md rounded-2xl border border-warm-100 bg-white p-8 shadow-sm dark:border-warm-700 dark:bg-warm-800">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-warm-800 dark:text-warm-50">
          Sign Up
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-warm-700 dark:text-warm-300"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 shadow-sm transition-colors focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 dark:border-warm-600 dark:bg-warm-700 dark:text-warm-100"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-warm-700 dark:text-warm-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 shadow-sm transition-colors focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 dark:border-warm-600 dark:bg-warm-700 dark:text-warm-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-warm-700 dark:text-warm-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-warm-800 shadow-sm transition-colors focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 dark:border-warm-600 dark:bg-warm-700 dark:text-warm-100"
              placeholder="Min. 6 characters"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-coral-50 p-3 text-sm text-coral-600 dark:bg-coral-500/10 dark:text-coral-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sage-500 px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-sage-600 hover:shadow focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-warm-500 dark:text-warm-400">
          Already have an account?{' '}
          <a href="/auth/login" className="font-medium text-sage-600 transition-colors hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
