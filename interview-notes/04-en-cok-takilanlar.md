# En Çok Takıldığın Yerler — Hızlı Tekrar

---

## 1. FONKSIYON DÖNDÜRMEYI UNUTMA

Soru "bir fonksiyon üret" diyorsa → `return function` ile başla.

```ts
// ❌ Yanlış — hemen çalışıp bitiyor
function debounce(fn, t) {
  clearTimeout(timer);
  setTimeout(() => fn(), t);
}

// ✅ Doğru — fonksiyon döndür, HER ÇAĞRIDA çalışsın
function debounce(fn, t) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), t);
  };
}
```

**Kural:** "createX", "debounce", "throttle", "memoize", "compose" görürsen → `return function`.

---

## 2. `fn` vs `fn()` — VERMEK vs ÇAĞIRMAK

```ts
// fn → fonksiyonun kendisi (referans)
setTimeout(fn, 1000);        // ✅ 1sn sonra çağrılsın
setInterval(fn, 1000);       // ✅ her 1sn'de çağrılsın

// fn() → fonksiyonu ŞİMDİ çağır, sonucunu ver
setTimeout(fn(), 1000);      // ❌ hemen çalışır, sonucu setTimeout'a gider
```

**Kural:** setTimeout/setInterval'e fonksiyon veriyorsan parantez KOYMA. Ya da arrow ile sar:

```ts
setTimeout(() => fn(...args), t);  // ✅ t ms sonra çağrılacak
```

---

## 3. `...args` UNUTMA

Her `return function` yazdığında otomatik `...args` ekle:

```ts
// ❌ Argümanlar kaybolur
return function () {
  fn();
}

// ✅ Argümanları topla ve aktar
return function (...args) {
  fn(...args);
}
```

**Ezberle:** `return function (...args)` + `fn(...args)` — bu ikili her yerde lazım.

---

## 4. `fn(arr[i], i)` — CALLBACK'E NE VERİYORSUN?

```ts
// ❌ Sadece index veriyorsun
fn(i)            // fn(0), fn(1), fn(2)

// ✅ Eleman + index
fn(arr[i], i)    // fn("ali", 0), fn("veli", 1)
```

**Kural:** Soruyu oku — `fn(element, index)` mi diyor, `fn(acc, element)` mi diyor?

---

## 5. PROMISE SYNTAX

```ts
// ❌ Yanlış — arrow function yok, resolve yok
new Promise(setTimeout(t))

// ✅ Doğru — (resolve) => { ... } formatı
new Promise((resolve) => {
  setTimeout(resolve, t);
});
```

**Ezberle:** `new Promise((resolve) => { ... })` — her zaman bu kalıp.

---

## 6. OBJE İÇİNDE METOD YAZMA

```ts
// ❌ Yanlış
{ function metod() { ... } }

// ✅ Doğru
{ metod() { ... } }
```

---

## 7. RETURN UNUTMA

```ts
// ❌ Hesaplıyor ama döndürmüyor
function filter(arr, fn) {
  let sonuc = [];
  for (...) { sonuc.push(...); }
  // return yok! → undefined döner
}

// ✅ Son satırda return
function filter(arr, fn) {
  let sonuc = [];
  for (...) { sonuc.push(...); }
  return sonuc;
}
```

---

## 8. 3 KATMAN KURALI

Her closure sorusunda düşün:

```
Katman 1: Bir kez çalışır     → değişken tanımla (timer, flag, Map)
Katman 2: Her çağrıda çalışır → asıl iş (kontrol, güncelle)
Katman 3: Gecikme sonrası     → setTimeout içi
```

---

## HIZLI KONTROL LİSTESİ (Kod yazmadan önce)

- [ ] Fonksiyon döndürmem gerekiyor mu?
- [ ] `return function (...args)` yazdım mı?
- [ ] `fn(...args)` diye çağırdım mı (parantez + spread)?
- [ ] Callback'e doğru şeyi veriyorum mu (eleman mı, index mi)?
- [ ] Sonucu `return` ediyorum mu?
