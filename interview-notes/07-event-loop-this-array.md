# Event Loop, this, Array Metodları — Hap Bilgi

---

## 1. EVENT LOOP — Çalışma Sırası

```
1. Call Stack (senkron kod) — HER ZAMAN ÖNCE
2. Microtask Queue (Promise.then, await) — SONRA
3. Macrotask Queue (setTimeout, setInterval) — EN SON
```

### Klasik soru:

```ts
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");
```

**Cevap: 1, 4, 3, 2**

```
1 → senkron
4 → senkron
3 → microtask (Promise)
2 → macrotask (setTimeout)
```

### Daha zor soru:

```ts
console.log("a");

setTimeout(() => console.log("b"), 0);

Promise.resolve().then(() => {
  console.log("c");
  Promise.resolve().then(() => console.log("d"));
});

console.log("e");
```

**Cevap: a, e, c, d, b**

```
a → senkron
e → senkron
c → microtask
d → microtask (microtask içinden eklenen microtask, macrotask'tan ÖNCE çalışır)
b → macrotask
```

### Kural: Microtask kuyruğu TAMAMEN boşalana kadar macrotask'a geçilmez.

---

## 2. THIS KEYWORD

`this` = "bu fonksiyonu KİM çağırdı?"

### Kural tablosu:

| Çağrı şekli | this değeri |
|---|---|
| `obj.metod()` | obj |
| `fonksiyon()` | undefined (strict) veya window |
| `new Sinif()` | yeni oluşan obje |
| `arrow function` | dışarıdaki this (kendi this'i yok) |
| `.call(obj)` / `.apply(obj)` | verdiğin obj |
| `.bind(obj)` | kalıcı olarak obj |

### Örnekler:

```ts
const user = {
  isim: "Ali",
  selamla() {
    console.log(this.isim);  // this = user
  }
};

user.selamla();  // "Ali" ✅

const fn = user.selamla;
fn();  // undefined ❌ — this artık user değil
```

### Arrow function farkı:

```ts
const user = {
  isim: "Ali",
  selamla: () => {
    console.log(this.isim);  // ❌ arrow'un kendi this'i yok
  },
  bekle() {
    setTimeout(() => {
      console.log(this.isim);  // ✅ "Ali" — arrow dışarıdaki this'i alır
    }, 1000);
  }
};
```

**Kural:** 
- Obje metodu → normal function (this = obje)
- Callback (setTimeout, map içi) → arrow function (this dışarıdan gelir)

### call, apply, bind:

```ts
function selamla(mesaj) {
  console.log(`${mesaj}, ${this.isim}`);
}

const user = { isim: "Ali" };

selamla.call(user, "Merhaba");    // "Merhaba, Ali" — hemen çağır
selamla.apply(user, ["Merhaba"]); // "Merhaba, Ali" — args array olarak
const bound = selamla.bind(user); // fonksiyon döndürür, çağırmaz
bound("Merhaba");                 // "Merhaba, Ali"
```

**call vs apply:** call = virgülle args, apply = array ile args. "a" = array.

---

## 3. ARRAY METODLARI — Hızlı Referans

### sort — Sırala

```ts
// ❌ Dikkat: varsayılan sort string olarak sıralar!
[10, 2, 30].sort();          // [10, 2, 30] → "10" < "2" ❌

// ✅ Sayı sıralaması:
[10, 2, 30].sort((a, b) => a - b);  // [2, 10, 30] küçükten büyüğe
[10, 2, 30].sort((a, b) => b - a);  // [30, 10, 2] büyükten küçüğe

// String sıralaması:
["Veli", "Ali"].sort((a, b) => a.localeCompare(b));  // ["Ali", "Veli"]
```

### find — İlk eşleşeni bul

```ts
const users = [{id: 1, isim: "Ali"}, {id: 2, isim: "Veli"}];

users.find(u => u.id === 2);        // {id: 2, isim: "Veli"}
users.find(u => u.id === 99);       // undefined (bulunamazsa)
```

### findIndex — İlk eşleşenin index'i

```ts
users.findIndex(u => u.id === 2);   // 1
users.findIndex(u => u.id === 99);  // -1
```

### some — En az biri koşulu sağlıyor mu?

```ts
[1, 2, 3, 4].some(n => n > 3);     // true (4 > 3)
[1, 2, 3].some(n => n > 5);        // false
```

### every — Hepsi koşulu sağlıyor mu?

```ts
[2, 4, 6].every(n => n % 2 === 0); // true (hepsi çift)
[2, 3, 6].every(n => n % 2 === 0); // false (3 çift değil)
```

### includes — Değer var mı?

```ts
[1, 2, 3].includes(2);             // true
[1, 2, 3].includes(5);             // false
"Merhaba".includes("hab");         // true
```

### flat — İç içe array'i düzleştir

```ts
[1, [2, 3], [4, [5]]].flat();      // [1, 2, 3, 4, [5]] (1 seviye)
[1, [2, [3, [4]]]].flat(Infinity); // [1, 2, 3, 4] (tamamen düz)
```

### reduce — Tek değere indir (hatırlatma)

```ts
[1, 2, 3, 4].reduce((acc, n) => acc + n, 0);  // 10
```

---

## 4. DESTRUCTURING — Hızlı Hatırlatma

### Obje destructuring:

```ts
const user = { isim: "Ali", yas: 25, sehir: "İstanbul" };

// Klasik:
const isim = user.isim;
const yas = user.yas;

// Destructuring:
const { isim, yas, sehir } = user;

// Yeniden isimlendirme:
const { isim: ad, yas: kacYasinda } = user;

// Default değer:
const { rol = "user" } = user;  // user.rol yoksa "user" olur
```

### Array destructuring:

```ts
const [ilk, ikinci, ...geriKalan] = [1, 2, 3, 4, 5];
// ilk = 1, ikinci = 2, geriKalan = [3, 4, 5]

// useState bunu kullanır:
const [count, setCount] = useState(0);
```

### Fonksiyon parametresinde:

```ts
// ❌ Uzun
function selamla(user) {
  console.log(user.isim);
}

// ✅ Kısa — parametrede destructure
function selamla({ isim, yas }) {
  console.log(isim);
}
```

---

## 5. SPREAD OPERATOR (...) — Hızlı Hatırlatma

```ts
// Array kopyala + ekle:
const yeni = [...eski, 4, 5];

// Obje kopyala + güncelle:
const yeniUser = { ...user, yas: 26 };

// Fonksiyona array'i aç:
fn(...args);  // fn(arg1, arg2, arg3)
```

---

## 6. REST API — POST İsteği

```ts
// GET (veri çek):
const res = await fetch("/api/users");
const data = await res.json();

// POST (veri gönder):
const res = await fetch("/api/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ isim: "Ali", yas: 25 }),
});
const data = await res.json();

// PUT (güncelle):
await fetch("/api/users/1", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ isim: "Ali Updated" }),
});

// DELETE (sil):
await fetch("/api/users/1", {
  method: "DELETE",
});
```

### HTTP Status Kodları (bilmen gerekenler):

| Kod | Anlam |
|-----|-------|
| 200 | Başarılı |
| 201 | Oluşturuldu (POST başarılı) |
| 400 | Bad Request (yanlış veri gönderdin) |
| 401 | Unauthorized (giriş yapılmamış) |
| 403 | Forbidden (yetkisiz) |
| 404 | Not Found |
| 500 | Server Error |

---

## 7. HIZLI ÖZET TABLOSU

| Konu | Ezberle |
|------|---------|
| Event loop | Senkron > Promise > setTimeout |
| this | "Kim çağırdı?" — obj.fn() → this=obj |
| Arrow this | Dışarıdaki this'i alır |
| sort sayı | `(a,b) => a - b` |
| find | İlk eşleşeni döndür |
| some/every | En az biri / hepsi mi? |
| destructuring | `const { x } = obj` veya `const [a] = arr` |
| spread | `...` kopyala/aç |
| POST fetch | method + headers + body |
