'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import type { User, UserRole } from '@/types';
import { realAuthApi, type OrganizationLoginRegisterDto, type AgencyLoginRegisterDto, type LoginResponseDto } from '@/lib/api';

const AUTH_TOKEN_KEY = 'tourops_access_token';
const AUTH_USER_DATA_KEY = 'tourops_user_data';

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
const publicPaths = ['/login', '/login/customer', '/login/admin', '/register', '/agency/login'];
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
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const savedUserData = localStorage.getItem(AUTH_USER_DATA_KEY);

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

            // Convert API user to local User type
            const loadedUser: User = {
              id: String(userData.id),
              name: `${userData.firstName} ${userData.lastName}`,
              email: userData.email,
              password: '',
              role,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setUser(loadedUser);
          } catch {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_DATA_KEY);
          }
        }
      } catch (error) {
        console.error('Auth kontrol hatasi:', error);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_DATA_KEY);
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
        router.replace('/agency/regions');
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

        const loadedUser: User = {
          id: String(userData.id),
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          password: '',
          role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Token is already stored by apiClient in verifyOtp
        setUser(loadedUser);

        // Save user data with type for session restore
        localStorage.setItem(AUTH_USER_DATA_KEY, JSON.stringify({
          ...userData,
          userType: type,
          isNewUser: result.data.isNewUser,
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

    const loadedUser: User = {
      id: String(userData.id),
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      password: '',
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUser(loadedUser);

    // Save user data for session restore
    localStorage.setItem(AUTH_USER_DATA_KEY, JSON.stringify({
      ...userData,
      userType: type,
      isNewUser: false, // No longer new after business registration
    }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_DATA_KEY);
    realAuthApi.logout();
    router.replace('/login');
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
