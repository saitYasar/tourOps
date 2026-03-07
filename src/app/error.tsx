'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{t.common.error}</h2>
        <p className="text-sm text-slate-500">
          {error.message || t.common.errorDescription}
        </p>
        <Button
          onClick={reset}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t.common.retry}
        </Button>
      </div>
    </div>
  );
}
