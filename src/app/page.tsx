import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthRedirect } from '@/components/landing/AuthRedirect';

export const metadata: Metadata = {
  title: 'TourOps - Tur Yönetiminin Dijital Merkezi',
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
    name: 'TourOps',
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
      <AuthRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold text-slate-900">TourOps</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Kayıt Ol
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAgMGgydi0ySDM2djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Tur Yönetiminin{' '}
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Dijital Merkezi
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed">
                Acenteler, işletmeler ve gezginler için hepsi bir arada platform.
                Turları planlayın, işletmelerle bağlantı kurun, müşterilerinize
                unutulmaz deneyimler sunun.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-600/25"
                >
                  Ücretsiz Başlayın
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-xl transition-colors"
                >
                  Giriş Yap
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 sm:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Tek Platformda Her Şey
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Tur operasyonlarınızı basitleştirin, verimliliği artırın.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h10"/><path d="M6 12h9"/><path d="M11 18h7"/><circle cx="4" cy="6" r="2"/><circle cx="14" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Tur Planlama</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Güzergah oluşturma, zaman çizelgesi ve kaynak yönetimini tek ekrandan yapın.
                </p>
              </div>
              {/* Feature 2 */}
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">İşletme Bağlantıları</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Otel, restoran ve aktivite sağlayıcılarıyla doğrudan iletişim kurun.
                </p>
              </div>
              {/* Feature 3 */}
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white text-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Müşteri Deneyimi</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Müşterilerinize kişiselleştirilmiş tur programları ve anlık bildirimler sunun.
                </p>
              </div>
              {/* Feature 4 */}
              <div className="p-6 rounded-2xl bg-violet-50 border border-violet-100">
                <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white text-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Güvenlik</h3>
                <p className="mt-2 text-sm text-slate-600">
                  OTP tabanlı giriş, rol bazlı erişim kontrolü ve şifrelenmiş veri aktarımı.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* User Types */}
        <section className="py-20 sm:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Herkes İçin Tasarlandı
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Rolünüz ne olursa olsun, TourOps size uygun araçlar sunar.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Agency */}
              <div className="rounded-2xl bg-white border border-blue-200 shadow-sm overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800" />
                <div className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-900">Acenteler</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Turları planlayın, işletmelerle anlaşma yapın, müşterilerinizi yönetin.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">&#10003;</span>
                      Bölge bazlı tur oluşturma
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">&#10003;</span>
                      İşletme davet sistemi
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">&#10003;</span>
                      Fiyat ve menü yönetimi
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">&#10003;</span>
                      Detaylı raporlama
                    </li>
                  </ul>
                  <Link
                    href="/register"
                    className="mt-8 block text-center px-6 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Acente Olarak Başla
                  </Link>
                </div>
              </div>

              {/* Organization / Business */}
              <div className="rounded-2xl bg-white border border-emerald-200 shadow-sm overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-emerald-600 via-green-700 to-teal-800" />
                <div className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-900">İşletmeler</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Menülerinizi ve fiyatlarınızı paylaşın, acentelerden rezervasyon alın.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">&#10003;</span>
                      Menü ve fiyat tanımlama
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">&#10003;</span>
                      Acente davetlerini yönetme
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">&#10003;</span>
                      Rezervasyon takibi
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">&#10003;</span>
                      Gelir analizi
                    </li>
                  </ul>
                  <Link
                    href="/register"
                    className="mt-8 block text-center px-6 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    İşletme Olarak Başla
                  </Link>
                </div>
              </div>

              {/* Customer / Traveler */}
              <div className="rounded-2xl bg-white border border-amber-200 shadow-sm overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600" />
                <div className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-900">Gezginler</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Tur programlarınızı görüntüleyin, anlık bildirimler alın.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">&#10003;</span>
                      Tur programı görüntüleme
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">&#10003;</span>
                      Anlık bildirimler
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">&#10003;</span>
                      Kolay iletişim
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">&#10003;</span>
                      Değerlendirme ve yorum
                    </li>
                  </ul>
                  <Link
                    href="/login/customer"
                    className="mt-8 block text-center px-6 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                  >
                    Gezgin Olarak Giriş Yap
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 sm:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Nasıl Çalışır?
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Üç basit adımda tur operasyonlarınızı dijitalleştirin.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto">
                  1
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900">Kayıt Olun</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Acente veya işletme olarak ücretsiz hesabınızı oluşturun. E-posta ile OTP doğrulaması yeterli.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto">
                  2
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900">Profilinizi Tamamlayın</h3>
                <p className="mt-2 text-sm text-slate-600">
                  İşletme bilgilerinizi, bölgelerinizi ve hizmetlerinizi tanımlayın.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto">
                  3
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-900">İşbirliği Başlasın</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Acenteler işletmeleri davet etsin, turlar planlansın, müşteriler deneyimlesin.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Tur Yönetiminizi Dijitalleştirin
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Hemen ücretsiz kayıt olun ve platformun tüm özelliklerini keşfedin.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block px-8 py-3.5 text-base font-semibold text-blue-700 bg-white hover:bg-blue-50 rounded-xl transition-colors shadow-lg"
            >
              Ücretsiz Başlayın
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} TourOps. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </>
  );
}
