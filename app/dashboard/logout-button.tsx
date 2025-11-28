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
      className="rounded-xl bg-warm-100 px-4 py-1.5 text-sm font-medium text-warm-600 transition-colors hover:bg-warm-200 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 dark:bg-warm-700 dark:text-warm-300 dark:hover:bg-warm-600"
    >
      Log Out
    </button>
  );
}
