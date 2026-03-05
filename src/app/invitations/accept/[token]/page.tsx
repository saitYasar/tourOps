'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, UserPlus } from 'lucide-react';

import { invitationApi, type LoginResponseDto } from '@/lib/api';
import { SprinterLoading } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type AcceptStatus = 'loading' | 'success' | 'error';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { updateSessionFromRegistration } = useAuth();
  const [status, setStatus] = useState<AcceptStatus>('loading');
  const [error, setError] = useState<string>('');
  const [userData, setUserData] = useState<LoginResponseDto['user'] | null>(null);

  // Prevent multiple executions
  const isProcessing = useRef(false);
  const hasProcessed = useRef(false);

  const token = params.token as string;

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Davet linki geçersiz');
      return;
    }

    // Prevent multiple executions
    if (isProcessing.current || hasProcessed.current) {
      return;
    }

    const acceptInvitation = async () => {
      isProcessing.current = true;

      try {
        console.log('Accepting invitation with token:', token.substring(0, 20) + '...');
        const result = await invitationApi.accept(token);
        console.log('Invitation accept result:', result);

        if (result.success && result.data) {
          hasProcessed.current = true;

          const user = result.data.user;
          setUserData(user);
          setStatus('success');

          // Determine user type from roles or default to organization
          const userRoles = user?.roles || [];
          const isAgency = userRoles.some((role: any) => {
            if (typeof role === 'string') {
              return role.includes('agency');
            }
            return role?.key?.includes('agency');
          });
          const userType = isAgency ? 'agency' : 'organization';

          // Update session with user data (token is already saved by apiClient)
          try {
            updateSessionFromRegistration(user, userType);
          } catch (sessionError) {
            console.error('Session update error:', sessionError);
          }

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            if (userType === 'agency') {
              router.push('/agency/regions');
            } else {
              router.push('/restaurant');
            }
          }, 2000);
        } else {
          setStatus('error');
          setError(result.error || 'Davet kabul edilemedi');
        }
      } catch (err) {
        console.error('Invitation accept error:', err);
        setStatus('error');
        setError((err as Error).message || 'Bir hata oluştu');
      } finally {
        isProcessing.current = false;
      }
    };

    acceptInvitation();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
                <SprinterLoading size="xs" />
              </div>
            )}
            {status === 'success' && (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Davet Kabul Ediliyor...'}
            {status === 'success' && 'Hoş Geldiniz!'}
            {status === 'error' && 'Hata Oluştu'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Lütfen bekleyin, davetiniz işleniyor.'}
            {status === 'success' && userData && (
              <>Merhaba {userData.firstName}, sisteme başarıyla giriş yaptınız.</>
            )}
            {status === 'error' && error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="text-center text-sm text-slate-500">
              Bu işlem birkaç saniye sürebilir...
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <UserPlus className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-700">
                  Ekibe başarıyla katıldınız. Yönlendiriliyorsunuz...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/login')}
                >
                  Giriş Yap
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Tekrar Dene
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
