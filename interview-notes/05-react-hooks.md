# React Hooks — Çalışma Kağıdı

---

## 1. HOOK NEDİR?

Fonksiyon component'lerde state ve lifecycle kullanmaya yarayan özel fonksiyonlar.
`use` ile başlar: `useState`, `useEffect`, `useMemo`...

**Kural:** Hook'lar sadece component'in en üst seviyesinde çağrılır — if/for/callback içinde OLMAZ.

```ts
// ❌ Yanlış
if (birsey) {
  const [x, setX] = useState(0);
}

// ✅ Doğru
const [x, setX] = useState(0);
```

---

## 2. useState — STATE TUTMA

```tsx
import { useState } from "react";

function Sayac() {
  const [sayi, setSayi] = useState(0);
  //     ^değer  ^güncelleyici    ^başlangıç

  return (
    <div>
      <p>{sayi}</p>
      <button onClick={() => setSayi(sayi + 1)}>Artır</button>
      <button onClick={() => setSayi(0)}>Sıfırla</button>
    </div>
  );
}
```

**Kurallar:**
- `setSayi(yeniDeger)` → state'i günceller, component yeniden render olur
- State doğrudan değiştirilemez: `sayi = 5` ❌ → `setSayi(5)` ✅
- Önceki değere göre güncelleme: `setSayi(prev => prev + 1)`

**Obje/Array state:**

```tsx
const [user, setUser] = useState({ isim: "Ali", yas: 25 });

// ❌ Yanlış — doğrudan mutate
user.isim = "Veli";

// ✅ Doğru — yeni obje oluştur (spread)
setUser({ ...user, isim: "Veli" });

// Array için:
const [liste, setListe] = useState([1, 2, 3]);
setListe([...liste, 4]);           // eleman ekle
setListe(liste.filter(n => n !== 2)); // eleman sil
```

---

## 3. useEffect — YAN ETKİLER

Component render olduktan SONRA çalışır. API çağrısı, timer, DOM manipülasyonu gibi işler için.

```tsx
import { useEffect } from "react";

// Her renderda çalışır
useEffect(() => {
  console.log("render oldu");
});

// Sadece ilk renderda çalışır (mount)
useEffect(() => {
  console.log("component yüklendi");
}, []);  // ← boş dependency array

// Belirli state değişince çalışır
useEffect(() => {
  console.log("sayi değişti:", sayi);
}, [sayi]);  // ← sayi değişince çalışır
```

**Cleanup (Temizlik):**

```tsx
useEffect(() => {
  const timer = setInterval(() => console.log("tick"), 1000);

  // Component kaldırılınca (unmount) çalışır:
  return () => {
    clearInterval(timer);  // temizle, memory leak olmasın
  };
}, []);
```

**Dependency array kuralı:**

| Array | Ne zaman çalışır |
|-------|-----------------|
| Yok | Her render |
| `[]` | Sadece mount (1 kez) |
| `[a, b]` | a veya b değişince |

---

## 4. useRef — DEĞİŞEN AMA RENDER TETİKLEMEYEN DEĞER

```tsx
import { useRef } from "react";

function Ornek() {
  const sayac = useRef(0);        // render tetiklemez
  const inputRef = useRef(null);  // DOM elemanına erişim

  function tikla() {
    sayac.current++;              // .current ile eriş
    console.log(sayac.current);   // render olmaz!
    inputRef.current.focus();     // input'a fokusla
  }

  return <input ref={inputRef} />;
}
```

**useState vs useRef:**

| useState | useRef |
|----------|--------|
| Değişince render olur | Değişince render OLMAZ |
| `sayi` ile oku | `.current` ile oku |
| UI göstermek için | Timer ID, DOM ref, önceki değer saklamak için |

---

## 5. useMemo — HESAPLAMA CACHE'LE

Pahalı hesaplamayı tekrar tekrar yapmamak için:

```tsx
import { useMemo } from "react";

function Liste({ items, filtre }) {
  // filtre veya items değişmedikçe tekrar hesaplamaz
  const filtrelenmis = useMemo(() => {
    return items.filter(item => item.includes(filtre));
  }, [items, filtre]);

  return <ul>{filtrelenmis.map(i => <li key={i}>{i}</li>)}</ul>;
}
```

**Ne zaman kullan:** Hesaplama yavaşsa ve dependency'ler sık değişmiyorsa.

---

## 6. useCallback — FONKSİYON REFERANSINI SAKLA

```tsx
import { useCallback } from "react";

function Parent() {
  const [sayi, setSayi] = useState(0);

  // Her renderda yeni fonksiyon oluşmasın
  const artir = useCallback(() => {
    setSayi(prev => prev + 1);
  }, []);  // dependency boş → fonksiyon hiç değişmez

  return <Child onClick={artir} />;
}
```

**Ne zaman kullan:** Child component'e prop olarak fonksiyon veriyorsan ve child `React.memo` ile sarılıysa.

---

## 7. CUSTOM HOOK — KENDİ HOOK'UNU YAZ

Tekrar eden mantığı çıkar, `use` ile başlayan fonksiyon yap:

```tsx
// useFetch.ts
function useFetch(url: string) {
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    setYukleniyor(true);

    fetch(url)
      .then(res => res.json())
      .then(data => setVeri(data))
      .catch(err => setHata(err))
      .finally(() => setYukleniyor(false));
  }, [url]);

  return { veri, yukleniyor, hata };
}

// Kullanım:
function Profil() {
  const { veri, yukleniyor, hata } = useFetch("/api/kullanici");

  if (yukleniyor) return <p>Yükleniyor...</p>;
  if (hata) return <p>Hata!</p>;
  return <p>{veri.isim}</p>;
}
```

---

## 8. useEffect İLE API ÇAĞRISI (Tam pattern)

```tsx
function KullaniciListesi() {
  const [kullanicilar, setKullanicilar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    async function veriCek() {
      try {
        const res = await fetch("/api/kullanicilar");
        const data = await res.json();
        setKullanicilar(data);
      } catch (err) {
        console.error(err);
      } finally {
        setYukleniyor(false);
      }
    }

    veriCek();
  }, []);

  if (yukleniyor) return <p>Yükleniyor...</p>;

  return (
    <ul>
      {kullanicilar.map(k => (
        <li key={k.id}>{k.isim}</li>
      ))}
    </ul>
  );
}
```

**Neden useEffect içinde async?**
- useEffect'in kendisi async olamaz
- İçinde async fonksiyon tanımla, hemen çağır

---

## 9. HOOK KURALLARI (Ezberle)

1. Hook'lar sadece component'in EN ÜST seviyesinde çağrılır
2. Hook'lar sadece React component veya custom hook içinde çağrılır
3. Hook isimleri `use` ile başlar
4. Dependency array'deki her değer referans eşitliği ile karşılaştırılır

---

## 10. ÖZET TABLO

| Hook | Ne yapar | Ne zaman kullan |
|------|----------|-----------------|
| useState | State tutar | UI'da gösterilecek değişen veri |
| useEffect | Yan etki çalıştır | API, timer, subscription |
| useRef | Render tetiklemeyen değer | Timer ID, DOM ref, önceki değer |
| useMemo | Hesaplama cache'le | Pahalı hesaplama |
| useCallback | Fonksiyon referansı sakla | Child'a prop olarak fn verme |

---

## 11. PRATİK SORULAR

1. Bir `useCounter(init)` custom hook yaz — `{ count, increment, decrement, reset }` döndürsün.
2. Bir `useLocalStorage(key, initialValue)` yaz — state'i localStorage'a kaydetsin.
3. Bir `useDebounce(value, delay)` yaz — value değişimini delay ms geciktirsin.
4. Bir component yaz: API'den veri çek, loading göster, listeyi render et.
