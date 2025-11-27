'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-md bg-zinc-200 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
    >
      Log Out
    </button>
  );
}
