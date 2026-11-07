# Promise, Async/Await ve Event Loop - Çalışma Kağıdı

---

## 1. SENKRON vs ASENKRON

```ts
// Senkron — satır satır bekler
console.log("1");
console.log("2");
console.log("3");
// Çıktı: 1, 2, 3

// Asenkron — beklemez, devam eder
console.log("1");
setTimeout(() => console.log("2"), 1000);
console.log("3");
// Çıktı: 1, 3, 2 (2 en son gelir çünkü 1sn bekliyor)
```

**Neden asenkron lazım?** API'den veri çekmek, dosya okumak, timer'lar — bunlar zaman alır, programı dondurmamak için asenkron çalışır.

---

## 2. CALLBACK (Eski yöntem)

```ts
function veriCek(url, basariCallback, hataCallback) {
  // API'ye istek at
  // Başarılıysa: basariCallback(veri)
  // Hatalıysa: hataCallback(hata)
}

veriCek(
  "/api/kullanici",
  (veri) => console.log(veri),
  (hata) => console.log(hata)
);
```

**Callback Hell (iç içe callback'ler — okunmaz hale gelir):**

```ts
veriCek("/api/kullanici", (kullanici) => {
  veriCek("/api/siparisler/" + kullanici.id, (siparisler) => {
    veriCek("/api/urunler/" + siparisler[0].urunId, (urun) => {
      console.log(urun); // 3 seviye iç içe — kabus
    }, hataFn);
  }, hataFn);
}, hataFn);
```

Bu sorunu çözmek için **Promise** icat edildi.

---

## 3. PROMISE (Söz)

**Tanım:** Gelecekte tamamlanacak (veya başarısız olacak) bir işlemin temsili.

**3 durumu var:**

| Durum | Anlamı |
|-------|--------|
| `pending` | Henüz bitmedi, bekliyor |
| `fulfilled` | Başarıyla tamamlandı |
| `rejected` | Hata ile bitti |

```ts
const soz = new Promise((resolve, reject) => {
  // Başarılıysa:
  resolve("veri geldi");

  // Hatalıysa:
  reject("bir şey ters gitti");
});
```

**Kullanımı:**

```ts
soz
  .then((sonuc) => console.log(sonuc))   // başarıysa burası çalışır
  .catch((hata) => console.log(hata))    // hatalıysa burası çalışır
  .finally(() => console.log("bitti"));  // her durumda çalışır
```

---

## 4. PROMISE CHAINING (Zincirleme)

Callback hell'i düzeltir — düz bir zincir haline getirir:

```ts
veriCek("/api/kullanici")
  .then((kullanici) => veriCek("/api/siparisler/" + kullanici.id))
  .then((siparisler) => veriCek("/api/urunler/" + siparisler[0].urunId))
  .then((urun) => console.log(urun))
  .catch((hata) => console.log(hata)); // tek bir yerde hata yakala
```

**Kural:** `.then()` içinde bir Promise döndürürsen, sonraki `.then()` onun sonucunu alır.

---

## 5. ASYNC / AWAIT (Modern yöntem)

Promise'in daha okunur hali. Aynı şeyi yapar ama senkron kod gibi görünür:

```ts
async function kullaniciBilgisi() {
  try {
    const kullanici = await veriCek("/api/kullanici");
    const siparisler = await veriCek("/api/siparisler/" + kullanici.id);
    const urun = await veriCek("/api/urunler/" + siparisler[0].urunId);
    console.log(urun);
  } catch (hata) {
    console.log(hata);
  }
}
```

**Kurallar:**
- `async` fonksiyonun başına yazılır — bu fonksiyon Promise döndürür demek
- `await` sadece `async` fonksiyon içinde kullanılır — "bu Promise bitene kadar bekle" demek
- Hata yakalamak için `try/catch` kullan

---

## 6. PROMISE STATIC METODLARI

```ts
// Promise.all — hepsi başarılı olursa sonuç döner, biri fail olursa hata
const [a, b, c] = await Promise.all([
  fetch("/api/1"),
  fetch("/api/2"),
  fetch("/api/3"),
]);
// Paralel çalışır — 3'ü aynı anda gider

// Promise.race — ilk biten (başarılı veya hatalı) kazanır
const ilk = await Promise.race([
  fetch("/api/yavas"),   // 3sn
  fetch("/api/hizli"),   // 1sn ← bu kazanır
]);

// Promise.allSettled — hepsi bitene kadar bekler (hata olsa bile)
const sonuclar = await Promise.allSettled([
  fetch("/api/1"),  // başarılı
  fetch("/api/2"),  // hatalı
]);
// [{status: "fulfilled", value: ...}, {status: "rejected", reason: ...}]

// Promise.any — ilk BAŞARILI olan kazanır (hatalıları yoksayar)
const ilkBasarili = await Promise.any([
  fetch("/api/hata"),    // reject
  fetch("/api/basarili"), // ← bu kazanır
]);
```

---

## 7. EVENT LOOP (Olay Döngüsü)

JavaScript **tek thread** çalışır. Peki asenkron işler nasıl oluyor? Event Loop sayesinde.

**Çalışma sırası:**

```
1. Call Stack (senkron kod) — önce bu biter
2. Microtask Queue (Promise.then, await) — sonra bu
3. Macrotask Queue (setTimeout, setInterval) — en son bu
```

**Klasik mülakat sorusu:**

```ts
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => console.log("3"));

console.log("4");

// Çıktı: 1, 4, 3, 2
```

**Neden bu sıra?**
1. `console.log("1")` → senkron, hemen çalışır → **1**
2. `setTimeout` → macrotask kuyruğuna gider (bekler)
3. `Promise.then` → microtask kuyruğuna gider (bekler)
4. `console.log("4")` → senkron, hemen çalışır → **4**
5. Call stack boşaldı → microtask'lar çalışır → **3**
6. Microtask bitti → macrotask çalışır → **2**

---

## 8. DEBOUNCE ve THROTTLE

### Debounce
"Son tetiklemeden X ms geçtikten sonra çalıştır." Kullanıcı yazmayı bırakınca arama yap.

```ts
function debounce(fn: Function, ms: number) {
  let timer: any;

  return function (...args: any[]) {
    clearTimeout(timer);           // önceki timer'ı iptal et
    timer = setTimeout(() => {
      fn(...args);                  // ms kadar sessizlik olunca çalıştır
    }, ms);
  };
}

// Kullanım: input'a her tuşa basıldığında değil, 300ms duraksayınca ara
const ara = debounce((query) => fetch("/api/search?q=" + query), 300);
```

### Throttle
"Her X ms'de en fazla 1 kez çalıştır." Scroll event'ini sınırla.

```ts
function throttle(fn: Function, ms: number) {
  let bekliyor = false;

  return function (...args: any[]) {
    if (bekliyor) return;           // henüz süre dolmadı, atla

    fn(...args);                    // çalıştır
    bekliyor = true;
    setTimeout(() => {
      bekliyor = false;             // süre doldu, tekrar çalışabilir
    }, ms);
  };
}

// Kullanım: scroll event'i saniyede 60 kez tetiklenir, biz 200ms'de 1 kez çalıştırırız
window.addEventListener("scroll", throttle(handleScroll, 200));
```

---

## 9. ÖZET TABLO

| Kavram | Bir Cümleyle |
|--------|-------------|
| Callback | Fonksiyonu parametre olarak ver, iş bitince çağrılır |
| Promise | Gelecekteki sonucu temsil eden obje |
| async/await | Promise'in okunur hali |
| .then() | Promise başarılı olunca çalışır |
| .catch() | Promise hatalı olunca çalışır |
| Promise.all | Hepsi başarılı → sonuç, biri hatalı → hata |
| Promise.race | İlk biten kazanır |
| Event Loop | Senkron > Microtask > Macrotask sırası |
| Debounce | Son tetiklemeden X ms sonra çalış |
| Throttle | Her X ms'de en fazla 1 kez çalış |

---

## 10. MÜLAKAT İPUÇLARI

1. **Event loop sorusunda:** Sıralamayı ezberle — senkron > microtask (Promise) > macrotask (setTimeout)
2. **async/await sorusunda:** `await` = "burada dur, Promise bitsin" demek
3. **Debounce vs Throttle:** "Arama kutusu = debounce, scroll = throttle" de
4. **Promise.all vs race:** "all = hepsi lazım, race = ilk yeter" de

---

## 11. PRATİK SORULAR (Kendin dene)

1. Bu kodun çıktı sırası ne?
```ts
console.log("a");
setTimeout(() => console.log("b"), 0);
Promise.resolve().then(() => console.log("c"));
console.log("d");
```

2. Bir `gecikme(ms)` fonksiyonu yaz — ms milisaniye bekleyen bir Promise döndürsün.

3. Bir `yenidenDene(fn, maxDeneme)` yaz — fn reject ederse en fazla maxDeneme kez tekrar denesin.

4. Kendi `Promise.all` implementasyonunu yaz.
