'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';

export default function RootPage() {
  const { session, loading } = useBusinessAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? '/inicio' : '/login');
  }, [loading, session, router]);

  return null;
}
