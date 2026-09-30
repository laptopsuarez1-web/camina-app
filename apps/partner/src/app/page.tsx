'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';

export default function RootPage() {
  const { session, business, isAdmin, loading } = useBusinessAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
    } else if (business) {
      router.replace(business.account_kind === 'events_only' ? '/eventos' : '/inicio');
    } else if (isAdmin) {
      router.replace('/admin');
    } else {
      router.replace('/inicio');
    }
  }, [loading, session, business, isAdmin, router]);

  return null;
}
