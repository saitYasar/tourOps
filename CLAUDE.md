# TourOps - Project Guidelines

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
