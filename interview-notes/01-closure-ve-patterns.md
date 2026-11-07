# JavaScript/TypeScript Temel Kavramlar - Çalışma Kağıdı

---

## 1. SCOPE (Kapsam)

Bir değişkenin "görülebildiği" alan.

```ts
const global = "ben her yerdeyim";

function ornek() {
  const lokal = "ben sadece bu fonksiyonun içindeyim";
  console.log(global); // ✅ erişebilir
  console.log(lokal);  // ✅ erişebilir
}

console.log(global); // ✅ erişebilir
console.log(lokal);  // ❌ ReferenceError - dışarıdan erişilemez
```

**3 tür scope var:**
- **Global scope** — dosyanın en üst seviyesi
- **Function scope** — fonksiyon içi
- **Block scope** — `{}` süslü parantez içi (let/const ile)

---

## 2. CLOSURE (Kapanış)

**Tanım:** Bir fonksiyon, kendi dışındaki (parent) scope'taki değişkenlere erişimini KORUR — parent fonksiyon çoktan bitmiş olsa bile.

```ts
function sayacOlustur() {
  let sayi = 0; // bu değişken fonksiyon bittikten sonra da yaşar

  return function () {
    sayi++;
    return sayi;
  };
}

const sayac = sayacOlustur(); // sayacOlustur bitti, ama sayi hala yaşıyor
console.log(sayac()); // 1
console.log(sayac()); // 2
console.log(sayac()); // 3
```

**Neden önemli?**
- Değişkeni dışarıdan gizler (encapsulation)
- State tutabilirsin fonksiyon içinde
- Factory pattern'in temelidir

**Gerçek hayat örneği:**

```ts
function indirimHesapla(oran: number) {
  // oran closure sayesinde hatırlanır
  return function (fiyat: number) {
    return fiyat - fiyat * oran;
  };
}

const yuzde10 = indirimHesapla(0.1);
const yuzde20 = indirimHesapla(0.2);

console.log(yuzde10(100)); // 90
console.log(yuzde20(100)); // 80
```

---

## 3. HIGHER-ORDER FUNCTION (Yüksek Dereceli Fonksiyon)

**Tanım:** Fonksiyonu parametre olarak ALAN veya fonksiyon DÖNDÜREN fonksiyon.

```ts
// Fonksiyon döndüren (createHelloWorld gibi)
function selamlayici(isim: string) {
  return function () {
    return `Merhaba ${isim}`;
  };
}

// Fonksiyon alan (map, filter gibi)
const sayilar = [1, 2, 3, 4, 5];
const ciftler = sayilar.filter(function (n) {
  return n % 2 === 0;
});
// ciftler = [2, 4]
```

**Günlük kullandığın higher-order function'lar:**
- `array.map(fn)`
- `array.filter(fn)`
- `array.reduce(fn)`
- `array.forEach(fn)`
- `setTimeout(fn, ms)`
- `addEventListener("click", fn)`

---

## 4. DESIGN PATTERNS (Tasarım Kalıpları)

Tekrar eden sorunlara kanıtlanmış çözüm şablonları.

---

### 4.1 Factory Pattern (Fabrika)

Bir fonksiyon çağırarak nesne/fonksiyon üretmek.

```ts
function kullaniciOlustur(isim: string, rol: string) {
  return {
    isim,
    rol,
    girisYap() {
      return `${isim} giriş yaptı (${rol})`;
    },
  };
}

const admin = kullaniciOlustur("Ali", "admin");
const misafir = kullaniciOlustur("Veli", "misafir");
```

**Ne zaman kullanılır:** Benzer yapıda ama farklı değerlerle nesne üretmen gerektiğinde.

---

### 4.2 Module Pattern (Modül)

Closure kullanarak private/public ayrımı yapmak.

```ts
function cuzdan() {
  let bakiye = 0; // private — dışarıdan erişilemez

  return {
    ekle(miktar: number) {
      bakiye += miktar;
    },
    harca(miktar: number) {
      if (miktar > bakiye) return "Yetersiz bakiye";
      bakiye -= miktar;
    },
    bakiyeGor() {
      return bakiye;
    },
  };
}

const benimCuzdan = cuzdan();
benimCuzdan.ekle(100);
benimCuzdan.harca(30);
console.log(benimCuzdan.bakiyeGor()); // 70
console.log(benimCuzdan.bakiye); // undefined — erişilemez!
```

---

### 4.3 Singleton Pattern (Tekil)

Tüm uygulamada sadece 1 tane olması gereken nesne.

```ts
const Ayarlar = (() => {
  let instance: { tema: string; dil: string } | null = null;

  return {
    getir() {
      if (!instance) {
        instance = { tema: "dark", dil: "tr" };
      }
      return instance;
    },
  };
})();

const a = Ayarlar.getir();
const b = Ayarlar.getir();
console.log(a === b); // true — aynı nesne
```

---

### 4.4 Observer Pattern (Gözlemci)

Bir olay olduğunda birden fazla dinleyiciyi bilgilendirmek.

```ts
function olayYonetici() {
  const dinleyiciler: Record<string, Function[]> = {};

  return {
    dinle(olay: string, fn: Function) {
      if (!dinleyiciler[olay]) dinleyiciler[olay] = [];
      dinleyiciler[olay].push(fn);
    },
    yayinla(olay: string, veri?: any) {
      if (!dinleyiciler[olay]) return;
      dinleyiciler[olay].forEach((fn) => fn(veri));
    },
  };
}

const bus = olayYonetici();
bus.dinle("siparis", (id: number) => console.log(`Sipariş #${id} alındı`));
bus.dinle("siparis", (id: number) => console.log(`Stok güncellendi: #${id}`));
bus.yayinla("siparis", 42);
// "Sipariş #42 alındı"
// "Stok güncellendi: #42"
```

**React'taki karşılığı:** useEffect + state, event handlers, context

---

### 4.5 Decorator Pattern (Dekoratör)

Mevcut fonksiyona ekstra özellik eklemek, orijinali değiştirmeden.

```ts
function logEkle(fn: Function, isim: string) {
  return function (...args: any[]) {
    console.log(`${isim} çağrıldı, argümanlar:`, args);
    const sonuc = fn(...args);
    console.log(`${isim} sonuç:`, sonuc);
    return sonuc;
  };
}

function topla(a: number, b: number) {
  return a + b;
}

const logluTopla = logEkle(topla, "topla");
logluTopla(3, 5);
// "topla çağrıldı, argümanlar: [3, 5]"
// "topla sonuç: 8"
```

---

## 5. ÖZET TABLO

| Kavram | Bir Cümleyle |
|--------|-------------|
| Scope | Değişkenin görülebildiği alan |
| Closure | Fonksiyon, doğduğu yerdeki değişkenleri hatırlar |
| Higher-Order Fn | Fonksiyon alan veya döndüren fonksiyon |
| Factory | Fonksiyon çağırarak nesne üret |
| Module | Closure ile private state sakla |
| Singleton | Tüm app'te tek bir instance |
| Observer | Olay olunca dinleyicileri bilgilendir |
| Decorator | Fonksiyonu sarmala, ekstra özellik ekle |

---

## 6. MÜLAKAT İPUÇLARI

1. **Closure sorulduğunda:** "Fonksiyon, lexical scope'undaki değişkenlere referans tutar" de
2. **Pattern sorulduğunda:** Gerçek bir kullanım senaryosu ver (yukarıdaki örnekler gibi)
3. **Kod yazarken:** Önce brute-force yaz, sonra "bunu closure/pattern ile nasıl temizlerim" diye düşün
4. **Emin olmadığında:** "Bu problemi şu pattern ile çözerim çünkü..." diye düşünceni açıkla

---

## 7. PRATİK SORULAR (Kendin dene)

1. Bir `carpanOlustur(x)` fonksiyonu yaz. Dönen fonksiyon aldığı sayıyı x ile çarpsın.
2. Bir `birKezCalistir(fn)` yaz. Dönen fonksiyon sadece ilk çağrıda fn'i çalıştırsın, sonrakilerde ilk sonucu döndürsün.
3. Bir `cache(fn)` yaz. Aynı argümanla tekrar çağrılınca hesaplama yapmadan önceki sonucu döndürsün (memoization).
