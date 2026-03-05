'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/shared';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user) {
      switch (user.role) {
        case 'agency':
          router.replace('/agency/regions');
          break;
        case 'restaurant':
          router.replace('/restaurant');
          break;
        case 'customer':
          router.replace('/customer');
          break;
      }
    }
  }, [user, isLoading, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <LoadingState message="Yonlendiriliyor..." />
    </div>
  );
}
