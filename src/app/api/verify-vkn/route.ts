import { NextRequest, NextResponse } from 'next/server';

// ============================================
// VKN Algorithmic Validation (Mod 10)
// 10 haneli tüzel kişi vergi numarası algoritması
// ============================================

function validateVknAlgorithm(vkn: string): boolean {
  if (vkn.length !== 10) return false;
  if (!/^\d{10}$/.test(vkn)) return false;

  const digits = vkn.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let tmp = (digits[i] + (9 - i)) % 10;
    let tmp2 = tmp * Math.pow(2, (9 - i)) % 9;
    if (tmp !== 0 && tmp2 === 0) tmp2 = 9;
    sum += tmp2;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[9];
}

// ============================================
// TCKN Algorithmic Validation
// 11 haneli gerçek kişi TC kimlik numarası algoritması
// ============================================

function validateTcknAlgorithm(tckn: string): boolean {
  if (tckn.length !== 11) return false;
  if (!/^\d{11}$/.test(tckn)) return false;
  if (tckn[0] === '0') return false;

  const d = tckn.split('').map(Number);

  // 10. hane kontrolü
  const check10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
  if (check10 !== d[9]) return false;

  // 11. hane kontrolü
  const sum = d.slice(0, 10).reduce((a, b) => a + b, 0);
  if (sum % 10 !== d[10]) return false;

  return true;
}

// ============================================
// GİB API (Dijital Vergi Dairesi)
// Not: Şu an login gerektiriyor, ileride anonim endpoint açılırsa çalışacak
// ============================================

const GIB_API = 'https://dijital.gib.gov.tr/apigateway/api';

async function tryGibLookup(vkn: string): Promise<{ companyName?: string } | null> {
  try {
    // GİB IVD token al
    const tokenRes = await fetch('https://ivd.gib.gov.tr/tvd_server/assos-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'assoscmd=cfsession&rtype=json&fskey=intvrg.fix.session&fuserid=INTVRG_FIX&gn=vkndogrulamalar&',
      signal: AbortSignal.timeout(5000),
    });

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();
    if (!tokenData.token) return null;

    // Dijital GİB API ile sorgula
    const res = await fetch(`${GIB_API}/vkn/dogrula`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.token}`,
      },
      body: JSON.stringify({ vergiNo: vkn, vergiDairesiKod: '' }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    // Başarılı response'da unvan döner
    if (data?.unvan) {
      return { companyName: data.unvan };
    }

    return null;
  } catch {
    // GİB API ulaşılamaz - sessizce fail
    return null;
  }
}

// ============================================
// Main Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { taxNumber } = await request.json();

    if (!taxNumber || typeof taxNumber !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Vergi numarası gerekli' },
        { status: 400 }
      );
    }

    const cleaned = taxNumber.replace(/\D/g, '');

    // 10 hane = tüzel kişi VKN, 11 hane = gerçek kişi TCKN
    if (cleaned.length === 10) {
      const isValid = validateVknAlgorithm(cleaned);

      if (!isValid) {
        return NextResponse.json({
          valid: false,
          error: 'Geçersiz vergi numarası (algoritma kontrolü başarısız)',
        });
      }

      // Algoritma geçerli — GİB'den şirket ünvanı almayı dene
      const gibResult = await tryGibLookup(cleaned);

      return NextResponse.json({
        valid: true,
        companyName: gibResult?.companyName || undefined,
      });
    }

    if (cleaned.length === 11) {
      const isValid = validateTcknAlgorithm(cleaned);

      if (!isValid) {
        return NextResponse.json({
          valid: false,
          error: 'Geçersiz TC kimlik numarası',
        });
      }

      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(
      { valid: false, error: 'Vergi numarası 10 veya 11 haneli olmalıdır' },
      { status: 400 }
    );
  } catch (error) {
    console.error('VKN verification error:', error);
    return NextResponse.json(
      { valid: false, error: 'Doğrulama sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
