'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import type { User, UserRole } from '@/types';
import { realAuthApi, apiClient, getAuthStorageKeys, getAuthRolePrefix, type OrganizationLoginRegisterDto, type AgencyLoginRegisterDto, type LoginResponseDto } from '@/lib/api';

// Parse JWT to extract organizationId/agencyId
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Login - sadece email ile OTP gonder
  startLogin: (email: string, type: 'organization' | 'agency') => Promise<{ success: boolean; error?: string }>;
  // Register - tum bilgilerle OTP gonder
  startRegistration: (data: OrganizationLoginRegisterDto | AgencyLoginRegisterDto, type: 'organization' | 'agency') => Promise<{ success: boolean; error?: string }>;
  // OTP dogrula
  verifyOtp: (email: string, otp: string, type: 'organization' | 'agency') => Promise<{ success: boolean; error?: string; data?: LoginResponseDto }>;
  // Update session after organization registration
  updateSessionFromRegistration: (userData: { id: number; firstName: string; lastName: string; email: string }, type: 'organization' | 'agency') => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public sayfalar (auth gerektirmeyen)
const publicPaths = ['/', '/login', '/login/customer', '/login/admin', '/register', '/agency/login'];
// Paths that start with these prefixes are also public
const publicPathPrefixes = ['/invitations/accept'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Sayfa yuklendiginde auth durumunu kontrol et
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        // Check for saved token and user data
        const keys = getAuthStorageKeys();
        const token = localStorage.getItem(keys.token);
        const savedUserData = localStorage.getItem(keys.userData);

        if (token && savedUserData) {
          try {
            const userData = JSON.parse(savedUserData);
            // Determine role from saved userType
            let role: UserRole;
            if (userData.userType === 'admin') {
              role = 'admin';
            } else if (userData.userType === 'organization') {
              role = 'restaurant';
            } else if (userData.userType === 'customer') {
              role = 'customer';
            } else {
              role = 'agency';
            }

            // Extract organizationId/agencyId from JWT token
            const jwtPayload = parseJwtPayload(token);
            const organizationId = jwtPayload?.organizationId as number | undefined;
            const agencyId = jwtPayload?.agencyId as number | undefined;

            // Convert API user to local User type
            const loadedUser: User = {
              id: String(userData.id),
              name: `${userData.firstName} ${userData.lastName}`,
              email: userData.email,
              password: '',
              role,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              restaurantId: organizationId ? String(organizationId) : userData.organizationId ? String(userData.organizationId) : undefined,
              customerId: userData.customerId ? String(userData.customerId) : undefined,
            };
            setUser(loadedUser);
          } catch {
            localStorage.removeItem(keys.token);
            localStorage.removeItem(keys.userData);
          }
        }
      } catch (error) {
        console.error('Auth kontrol hatasi:', error);
        const keys = getAuthStorageKeys();
        localStorage.removeItem(keys.token);
        localStorage.removeItem(keys.userData);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Auth durumuna gore yonlendirme
  useEffect(() => {
    if (isLoading) return;

    const isPublicPath = publicPaths.includes(pathname) ||
      publicPathPrefixes.some(prefix => pathname.startsWith(prefix));
    const isAdminPath = pathname.startsWith('/admin');
    const isCustomerPath = pathname.startsWith('/customer');

    if (!user && !isPublicPath) {
      // Giris yapilmamis ve public olmayan sayfa
      // Admin sayfasi icin admin login'e, digerleri icin normal login'e yonlendir
      if (isAdminPath) {
        router.replace('/login/admin');
      } else {
        router.replace('/login');
      }
    } else if (user && isPublicPath && !pathname.startsWith('/invitations') && !pathname.startsWith('/agency/login')) {
      // Giris yapilmis ve public sayfa (login/register) - dashboard'a yonlendir
      // Invitation ve agency/login sayfalarinda kalmasina izin ver
      // Agency kullanicilari icin: zaten giris yapmis, public sayfaya geri donmus (back button)
      if (user.role === 'agency') {
        router.replace('/agency');
        return;
      }
      redirectToDashboard(user.role);
    } else if (user && isAdminPath && user.role !== 'admin') {
      // Admin sayfasina erismeye calisan admin olmayan kullanici
      redirectToDashboard(user.role);
    } else if (user && isCustomerPath && user.role !== 'customer') {
      // Customer sayfasina erismeye calisan customer olmayan kullanici
      redirectToDashboard(user.role);
    }
  }, [user, isLoading, pathname, router]);

  const redirectToDashboard = useCallback((role: UserRole, isNewUser?: boolean) => {
    switch (role) {
      case 'admin':
        router.replace('/admin');
        break;
      case 'agency':
        if (isNewUser) {
          router.replace('/agency/setup');
        } else {
          router.replace('/agency');
        }
        break;
      case 'restaurant':
        // If new user (from registration), redirect to setup page
        if (isNewUser) {
          router.replace('/restaurant/setup');
        } else {
          router.replace('/restaurant');
        }
        break;
      case 'customer':
        router.replace('/customer');
        break;
    }
  }, [router]);

  // Start login - sadece email ile OTP gonder
  const startLogin = useCallback(async (
    email: string,
    type: 'organization' | 'agency'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (type === 'organization') {
        const result = await realAuthApi.organizationLoginSendOtp(email);
        return result;
      } else {
        const result = await realAuthApi.agencyLoginSendOtp(email);
        return result;
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, []);

  // Start registration - tum bilgilerle OTP gonder
  const startRegistration = useCallback(async (
    data: OrganizationLoginRegisterDto | AgencyLoginRegisterDto,
    type: 'organization' | 'agency'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (type === 'organization') {
        const result = await realAuthApi.organizationSendOtp(data);
        return result;
      } else {
        const result = await realAuthApi.agencySendOtp(data);
        return result;
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, []);

  // Verify OTP and complete login/registration
  const verifyOtp = useCallback(async (
    email: string,
    otp: string,
    type: 'organization' | 'agency'
  ): Promise<{ success: boolean; error?: string; data?: LoginResponseDto }> => {
    try {
      const result = type === 'organization'
        ? await realAuthApi.organizationVerify(email, otp)
        : await realAuthApi.agencyVerify(email, otp);

      if (result.success && result.data) {
        const userData = result.data.user;
        const role: UserRole = type === 'organization' ? 'restaurant' : 'agency';
        const rolePrefix = type === 'organization' ? 'restaurant' : 'agency';
        const correctKeys = getAuthStorageKeys(rolePrefix);

        // Ensure token is stored under the correct role-specific key
        // (login page pathname may differ from dashboard pathname)
        const accessToken = apiClient.getAccessToken();
        if (accessToken) {
          localStorage.setItem(correctKeys.token, accessToken);
        }

        // Extract organizationId/agencyId from JWT or response
        const token = accessToken || localStorage.getItem(correctKeys.token);
        const jwtPayload = token ? parseJwtPayload(token) : null;
        const organizationId = (jwtPayload?.organizationId as number) || result.data.organization?.id;
        const agencyId = (jwtPayload?.agencyId as number) || result.data.agency?.id;

        const loadedUser: User = {
          id: String(userData.id),
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          password: '',
          role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          restaurantId: organizationId ? String(organizationId) : undefined,
        };

        setUser(loadedUser);

        // Save user data under the correct role-specific key
        localStorage.setItem(correctKeys.userData, JSON.stringify({
          ...userData,
          userType: type,
          isNewUser: result.data.isNewUser,
          organizationId: organizationId || undefined,
          agencyId: agencyId || undefined,
        }));

        // Check organization/agency status - if new user, redirect to setup
        const isNewUser = result.data.isNewUser ||
          result.data.organization?.status === 'pending_setup' ||
          result.data.agency?.status === 'pending_setup';

        redirectToDashboard(loadedUser.role, isNewUser);
        return { success: true, data: result.data };
      }

      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [redirectToDashboard]);

  // Update session after organization/agency registration (business setup)
  const updateSessionFromRegistration = useCallback((
    userData: { id: number; firstName: string; lastName: string; email: string },
    type: 'organization' | 'agency'
  ) => {
    const role: UserRole = type === 'organization' ? 'restaurant' : 'agency';
    const rolePrefix = type === 'organization' ? 'restaurant' : 'agency';
    const correctKeys = getAuthStorageKeys(rolePrefix);

    // Extract organizationId/agencyId from current JWT
    const token = typeof window !== 'undefined' ? localStorage.getItem(correctKeys.token) : null;
    const jwtPayload = token ? parseJwtPayload(token) : null;
    const organizationId = jwtPayload?.organizationId as number | undefined;

    const loadedUser: User = {
      id: String(userData.id),
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      password: '',
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      restaurantId: organizationId ? String(organizationId) : undefined,
    };

    setUser(loadedUser);

    // Save user data for session restore
    localStorage.setItem(correctKeys.userData, JSON.stringify({
      ...userData,
      userType: type,
      isNewUser: false,
      organizationId: organizationId || undefined,
      agencyId: (jwtPayload?.agencyId as number) || undefined,
    }));
  }, []);

  const logout = useCallback(() => {
    const prefix = getAuthRolePrefix();
    setUser(null);
    realAuthApi.logout();
    const loginPaths: Record<string, string> = {
      customer: '/login/customer',
      admin: '/login/admin',
      agency: '/agency/login',
      restaurant: '/login',
    };
    router.replace(loginPaths[prefix] || '/login');
  }, [router]);

  // Register logout callback with API client for 401 handling
  useEffect(() => {
    realAuthApi.setOnUnauthorized(logout);
    return () => realAuthApi.setOnUnauthorized(null);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        startLogin,
        startRegistration,
        verifyOtp,
        updateSessionFromRegistration,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
