'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function AuthRedirect() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    switch (user.role) {
      case 'agency':
        router.replace('/agency');
        break;
      case 'restaurant':
        router.replace('/restaurant');
        break;
      case 'customer':
        router.replace('/customer');
        break;
      case 'admin':
        router.replace('/admin');
        break;
    }
  }, [user, isLoading, isAuthenticated, router]);

  return null;
}
