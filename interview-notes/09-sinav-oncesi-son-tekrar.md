# Sınav Öncesi Son Tekrar

---

## SENİN HATALARIN — KONTROL LİSTESİ

Kod yazmadan önce 5 saniye dur, bunları kontrol et:

### ✍️ Yazarken

- [ ] `for(let i = 0; ...)` — başlangıç değeri var mı?
- [ ] `return` var mı sonda?
- [ ] `return function(...args)` — fonksiyon döndürmen gerekiyor mu?
- [ ] `fn(...args)` — fonksiyonu çağırıyorum mu, parantez var mı?
- [ ] `fn(arr[i], i)` — callback'e index de veriyor muyum?

### ⚛️ React yazarken

- [ ] `onClick={() => fn()}` — arrow ile sardım mı? (hemen çağırma!)
- [ ] `style={{ camelCase: "value" }}` — obje mi yazdım?
- [ ] `useState` kullandım mı? (let ile state tutma)
- [ ] `setX(prev => prev + 1)` — önceki değere göre güncelleme
- [ ] Props: `function Comp({ prop })` — destructure
- [ ] useEffect async olamaz → içinde tanımla, çağır
- [ ] `.map()` içinde `{}` varsa `return` lazım, `()` ise otomatik

### 🎨 CSS yazarken

- [ ] React'ta: `style={{ }}` obje + camelCase
- [ ] HTML'de: `style="property: value;"`
- [ ] `justify-content` (flex yatay) — `align-items` (flex dikey)
- [ ] Değerler string: `"flex-end"`, `"space-between"`

---

## JS TRİCK'LERİ (Sınavda şaşırma)

```
[] truthy'dir (falsy DEĞİL)
"5" - 3 = 2 (çıkarma sayıya çevirir)
"5" + 3 = "53" (toplama string birleştirir)
0.1 + 0.2 !== 0.3 (kayan nokta)
typeof [] === "object" (array değil!)
null == undefined → true
null === undefined → false
String immutable — a[0] = "X" çalışmaz
Object.freeze → değiştirmeyi engeller
```

---

## EVENT LOOP — SIRA

```
1. Senkron kod (console.log, değişken atama)
2. Microtask (Promise.then, await sonrası)
3. Macrotask (setTimeout, setInterval)
```

`async function` içinde: await ÖNCESİ senkron çalışır!

---

## PROMISE — EZBERLE

```ts
// Sleep
return new Promise((resolve) => { setTimeout(resolve, ms) })

// Fetch pattern
try {
  const res = await fetch(url)
  const data = await res.json()
} catch(e) { }
```

---

## CLOSURE — EZBERLE

```ts
// Debounce
let timer;
return function(...args) {
  clearTimeout(timer)
  timer = setTimeout(() => fn(...args), ms)
}

// Throttle
let flag = false;
return function(...args) {
  if(flag) return
  fn(...args)
  flag = true
  setTimeout(() => { flag = false }, t)
}

// Once
let called = false, value;
return function(...args) {
  if(called) return value
  called = true
  value = fn(...args)
  return value
}

// Memoize
const cache = {};
return function(...args) {
  const key = JSON.stringify(args)
  if(key in cache) return cache[key]
  cache[key] = fn(...args)
  return cache[key]
}
```

---

## HTML/CSS HAP BİLGİ

### HTML Temel Yapı

```html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sayfa Başlığı</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <nav>
      <a href="/">Ana Sayfa</a>
      <a href="/about">Hakkında</a>
    </nav>
  </header>

  <main>
    <section>
      <h1>Başlık</h1>
      <p>Paragraf</p>
    </section>
  </main>

  <footer>
    <p>&copy; 2026</p>
  </footer>

  <script src="app.js"></script>
</body>
</html>
```

### Semantic Etiketler

```
<header>  — sayfa/bölüm başlığı
<nav>     — navigasyon
<main>    — ana içerik (1 tane)
<section> — tematik bölüm
<article> — bağımsız içerik
<aside>   — yan içerik
<footer>  — alt bilgi
```

### Form

```html
<form>
  <label for="email">Email</label>
  <input id="email" type="email" placeholder="email@ornek.com" required />
  
  <label for="sifre">Şifre</label>
  <input id="sifre" type="password" required />
  
  <select>
    <option value="1">Seçenek 1</option>
    <option value="2">Seçenek 2</option>
  </select>
  
  <textarea rows="4" placeholder="Mesajınız"></textarea>
  
  <button type="submit">Gönder</button>
</form>
```

### Input Tipleri

```
type="text"      — metin
type="email"     — email (doğrulama)
type="password"  — şifre
type="number"    — sayı
type="checkbox"  — onay kutusu
type="radio"     — tekli seçim
type="file"      — dosya yükleme
type="date"      — tarih
type="tel"       — telefon
```

### CSS Temel

```css
/* Seçiciler */
div { }           /* element */
.class { }        /* class — 10 puan */
#id { }           /* id — 100 puan */
div > p { }       /* doğrudan child */
div p { }         /* tüm child'lar */
div + p { }       /* hemen sonraki kardeş */

/* Flexbox */
.container {
  display: flex;
  flex-direction: row;        /* veya column */
  justify-content: center;    /* ana eksen */
  align-items: center;        /* çapraz eksen */
  gap: 16px;
  flex-wrap: wrap;
}

/* Grid */
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* Ortalama — 3 yol */
/* Flex */ display:flex; justify-content:center; align-items:center;
/* Grid */ display:grid; place-items:center;
/* Position */ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);

/* Box Model */
* { box-sizing: border-box; }

/* Responsive */
@media (max-width: 768px) {
  .container { flex-direction: column; }
}
```

### CSS Specificity (düşükten yükseğe)

```
element (div, p)     → 1 puan
.class, [attr]       → 10 puan
#id                  → 100 puan
inline style=""      → 1000 puan
!important           → her şeyi ezer
```

---

## REACT — HIZLI ŞABLON

```tsx
function Component({ prop1, prop2 }) {
  const [state, setState] = useState(initialValue);
  const ref = useRef(null);

  useEffect(() => {
    // side effect
    return () => { /* cleanup */ };
  }, [dependency]);

  const computed = useMemo(() => {
    return expensiveCalculation();
  }, [dependency]);

  function handleClick() {
    setState(prev => prev + 1);
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <button onClick={handleClick}>{state}</button>
      {items.map(item => (
        <span key={item.id}>{item.name}</span>
      ))}
    </div>
  );
}
```

---

## SON SÖZ

1. Soruyu tam oku
2. Yavaş yaz
3. return kontrol et
4. Parantezleri say
5. Bilmediğini boş bırakma — kısmi çözüm yaz
