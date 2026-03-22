import type { Metadata } from 'next';

import { QueryProvider } from '@/contexts/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/sonner';

import './globals.css';

const siteUrl = 'https://tourops.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'HerHafta - Tur Yönetim Sistemi',
    template: '%s | HerHafta',
  },
  description:
    'Acenteler, işletmeler ve gezginler için hepsi bir arada tur yönetim platformu. Turları planlayın, işletmelerle bağlantı kurun.',
  keywords: [
    'tur yönetimi',
    'seyahat acentesi',
    'tur planlama',
    'turizm platformu',
    'tur operatörü',
  ],
  authors: [{ name: 'HerHafta' }],
  creator: 'HerHafta',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: siteUrl,
    siteName: 'HerHafta',
    title: 'HerHafta - Tur Yönetiminin Dijital Merkezi',
    description:
      'Acenteler, işletmeler ve gezginler için hepsi bir arada tur yönetim platformu.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HerHafta - Tur Yönetim Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HerHafta - Tur Yönetiminin Dijital Merkezi',
    description:
      'Acenteler, işletmeler ve gezginler için hepsi bir arada tur yönetim platformu.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          <LanguageProvider>
            <AuthProvider>
              <MainLayout>{children}</MainLayout>
              <Toaster position="top-right" richColors />
            </AuthProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
