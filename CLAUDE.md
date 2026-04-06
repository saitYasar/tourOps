# TourOps - Project Guidelines

## Türkçe Karakter Kuralı

Tüm kullanıcıya görünen metinlerde (UI, metadata, SEO, placeholder, açıklama vb.) **Türkçe özel karakterler** doğru yazılmalıdır. ASCII karşılıkları kullanılmamalıdır:

| Yanlış | Doğru |
|--------|-------|
| o | ö |
| s | ş |
| u | ü |
| c | ç |
| g | ğ |
| i | ı (küçük noktalı i değil, noktasız ı) |
| I | İ (büyük noktasız I değil, noktalı İ) |

**Örnekler:**
- `Yonetim` → `Yönetim`
- `Isletme` → `İşletme`
- `ucretsiz` → `ücretsiz`
- `dijitallestirin` → `dijitalleştirin`
- `giris` → `giriş`
- `musteri` → `misafir` (UI'da her yerde "misafir" kullanılmaktadır, "müşteri" kullanılmaz)

Bu kural metadata, SEO title/description, hardcoded string ve locale dosyaları dahil tüm Türkçe metinler için geçerlidir.

## Auto-Select Rule for Dropdowns

Dinamik veri ile dolan Select/dropdown bilesenlerinde, eger **tek bir secenek** varsa ve **henuz bir sey secilmemisse**, o secenek otomatik olarak secili gelmeli.

### Kullanim

`useAutoSelect` hook'unu kullan (`src/hooks/useAutoSelect.ts`):

```ts
import { useAutoSelect } from '@/hooks/useAutoSelect';

useAutoSelect(items, currentValue, onSelect, { enabled: isDialogOpen });
```

- `items`: Dropdown'daki secenekler (array)
- `currentValue`: Secili deger (`''`, `null`, `undefined`, `0` ise "secilmemis")
- `onSelect`: Secim callback'i (hook icerisinde ref ile stabilize edilir)
- `enabled`: Dialog/form kapali iken tetiklenmesini engeller

### Cascading Select'ler

Parent degistiginde child'in secenekleri yenileniyorsa ve 1 eleman kaliyorsa, otomatik secilir. Ornek: Ulke -> Sehir -> Ilce zinciri.

### Uygulanmamali

- **Status filter select'leri** - "Tumu" default'u olan filtreler
- **Static listeler** - Telefon ulke kodu (+90 default), kapasite ([2,4,6,8,10,12])
- **Onceden doldurulmus select'ler** - Edit formlarinda mevcut degeri olan alanlar
- **Layout Editor** - useEffect ile zaten ilk secimi yapan bilesenler
