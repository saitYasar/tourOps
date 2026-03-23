import type { Metadata } from 'next';
import { HomePageContent } from '@/components/landing/HomePageContent';

export const metadata: Metadata = {
  title: 'HerHafta - Tur Yönetiminin Dijital Merkezi',
  description:
    'Acenteler, işletmeler ve gezginler için hepsi bir arada tur yönetim platformu. Turları planlayın, işletmelerle bağlantı kurun, müşterilerinize unutulmaz deneyimler sunun.',
  keywords: [
    'tur yönetimi',
    'seyahat acentesi',
    'tur planlama',
    'otel yönetimi',
    'restoran yönetimi',
    'turizm platformu',
    'tur operatörü',
    'dijital tur yönetimi',
  ],
};

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HerHafta',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Acenteler, işletmeler ve gezginler için hepsi bir arada tur yönetim platformu.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'TRY',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageContent />
    </>
  );
}
