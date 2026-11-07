# Çoktan Seçmeli Final Sınavı — 50 Soru

---

## BÖLÜM 1: JavaScript Temelleri (Soru 1-10)

### Soru 1
```ts
let x = 5;
console.log(x++);
```
A) 5  
B) 6  
C) undefined  
D) NaN  

---

### Soru 2
```ts
console.log(typeof []);
```
A) "array"  
B) "object"  
C) "undefined"  
D) "list"  

---

### Soru 3
Hangisi falsy değildir?
A) 0  
B) ""  
C) []  
D) null  

---

### Soru 4
```ts
const a = [1,2,3];
const b = a;
b.push(4);
console.log(a.length);
```
A) 3  
B) 4  
C) undefined  
D) Error  

---

### Soru 5
```ts
console.log(0.1 + 0.2 === 0.3);
```
A) true  
B) false  
C) undefined  
D) Error  

---

### Soru 6
```ts
let a = "hello";
a[0] = "H";
console.log(a);
```
A) "Hello"  
B) "hello"  
C) Error  
D) undefined  

---

### Soru 7
```ts
console.log("5" - 3);
console.log("5" + 3);
```
A) 2, 8  
B) 2, "53"  
C) "53", 8  
D) NaN, "53"  

---

### Soru 8
Hangisi array'in son elemanını verir?
A) arr[arr.length]  
B) arr[arr.length - 1]  
C) arr.last()  
D) arr[-1]  

---

### Soru 9
```ts
const obj = { a: 1 };
Object.freeze(obj);
obj.a = 2;
console.log(obj.a);
```
A) 2  
B) 1  
C) undefined  
D) Error  

---

### Soru 10
```ts
console.log(null == undefined);
console.log(null === undefined);
```
A) true, true  
B) true, false  
C) false, true  
D) false, false  

---

## BÖLÜM 2: Closure & Higher-Order Functions (Soru 11-20)

### Soru 11
```ts
function outer() {
  let x = 10;
  return function() { return x; };
}
const fn = outer();
console.log(fn());
```
A) undefined  
B) 10  
C) Error  
D) null  

---

### Soru 12
Closure nedir?
A) Fonksiyonun kendi scope'undaki değişkenlere erişememesi  
B) Fonksiyonun dışındaki scope'taki değişkenlere erişimini koruması  
C) İki fonksiyonun aynı anda çalışması  
D) Obje içinde fonksiyon tanımlamak  

---

### Soru 13
```ts
function make(x) {
  return function(y) { return x + y; };
}
const add5 = make(5);
console.log(add5(3));
```
A) 5  
B) 3  
C) 8  
D) undefined  

---

### Soru 14
Higher-order function nedir?
A) Sadece sayı döndüren fonksiyon  
B) Fonksiyon alan veya fonksiyon döndüren fonksiyon  
C) Class içinde tanımlanan fonksiyon  
D) Async fonksiyon  

---

### Soru 15
```ts
const fns = [x => x+1, x => x*2, x => x-3];
let val = 5;
for(let i = fns.length-1; i >= 0; i--) {
  val = fns[i](val);
}
console.log(val);
```
A) 5  
B) 7  
C) 4  
D) 5  

---

### Soru 16
```ts
function once(fn) {
  let called = false, result;
  return function(...args) {
    if(called) return result;
    called = true;
    result = fn(...args);
    return result;
  };
}
const f = once(x => x * 2);
console.log(f(5), f(10));
```
A) 10, 20  
B) 10, 10  
C) 5, 10  
D) undefined, undefined  

---

### Soru 17
`debounce` ne yapar?
A) Fonksiyonu hemen çalıştırır  
B) Son çağrıdan t ms sonra çalıştırır, arada çağrılırsa sıfırlar  
C) Her t ms'de bir çalıştırır  
D) Fonksiyonu sadece 1 kez çalıştırır  

---

### Soru 18
`throttle` ne yapar?
A) Son çağrıdan t ms sonra çalıştırır  
B) Her t ms'de en fazla 1 kez çalıştırır  
C) Fonksiyonu iptal eder  
D) Fonksiyonu cache'ler  

---

### Soru 19
Memoize'da cache key olarak ne kullanılır?
A) Fonksiyonun adı  
B) JSON.stringify(args)  
C) Math.random()  
D) Fonksiyonun length'i  

---

### Soru 20
```ts
function counter() {
  let count = 0;
  return { inc() { return ++count; } };
}
const a = counter();
const b = counter();
a.inc(); a.inc();
console.log(a.inc(), b.inc());
```
A) 3, 3  
B) 3, 1  
C) 2, 1  
D) 3, 0  

---

## BÖLÜM 3: Promise & Async (Soru 21-30)

### Soru 21
Promise'in 3 durumu nedir?
A) start, running, done  
B) pending, fulfilled, rejected  
C) open, closed, error  
D) waiting, success, fail  

---

### Soru 22
```ts
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");
```
A) 1, 2, 3, 4  
B) 1, 4, 2, 3  
C) 1, 4, 3, 2  
D) 1, 3, 4, 2  

---

### Soru 23
`await` ne yapar?
A) Fonksiyonu siler  
B) Promise bitene kadar bekler  
C) Yeni thread oluşturur  
D) Fonksiyonu 1 kez çalıştırır  

---

### Soru 24
```ts
async function foo() {
  return 5;
}
foo().then(x => console.log(x));
```
A) 5  
B) Promise  
C) undefined  
D) Error  

---

### Soru 25
`Promise.all` ne yapar?
A) İlk biten Promise'i döndürür  
B) Tüm Promise'ler başarılı olunca sonuçları döndürür, biri fail olursa reject  
C) Hepsini sırayla çalıştırır  
D) Sadece başarılı olanları döndürür  

---

### Soru 26
`Promise.race` ne yapar?
A) Hepsini bekler  
B) İlk biten (resolve veya reject) kazanır  
C) Sadece resolve olanları döndürür  
D) En yavaş olanı döndürür  

---

### Soru 27
Hangisi doğru sleep implementasyonu?
A) `function sleep(ms) { setTimeout(ms) }`  
B) `function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }`  
C) `function sleep(ms) { await setTimeout(ms) }`  
D) `function sleep(ms) { return setTimeout(ms) }`  

---

### Soru 28
```ts
async function foo() {
  console.log("A");
  await Promise.resolve();
  console.log("B");
}
console.log("C");
foo();
console.log("D");
```
A) C, A, D, B  
B) A, B, C, D  
C) C, D, A, B  
D) C, A, B, D  

---

### Soru 29
`try/catch` ile hata yakalamak için fetch nasıl yazılır?
A) `try { fetch(url).catch(e) }`  
B) `try { const res = await fetch(url) } catch(e) { }`  
C) `try ( await fetch(url) ).catch(e)`  
D) `catch { fetch(url) } try { }`  

---

### Soru 30
useEffect içinde async fonksiyon nasıl kullanılır?
A) `useEffect(async () => { ... }, [])`  
B) `useEffect(() => { async function f(){...} f(); }, [])`  
C) `async useEffect(() => { ... }, [])`  
D) `useEffect(await fetch(...), [])`  

---

## BÖLÜM 4: React Hooks (Soru 31-40)

### Soru 31
useState hook'u ne döndürür?
A) Sadece değer  
B) [değer, güncelleyici fonksiyon]  
C) Bir obje  
D) undefined  

---

### Soru 32
```tsx
const [count, setCount] = useState(0);
setCount(count + 1);
setCount(count + 1);
console.log(count); // render sonrası
```
Render sonrası count kaçtır?
A) 2  
B) 1  
C) 0  
D) Error  

---

### Soru 33
useEffect dependency array boş `[]` olursa ne olur?
A) Her renderda çalışır  
B) Sadece ilk renderda çalışır (mount)  
C) Hiç çalışmaz  
D) Hata verir  

---

### Soru 34
useEffect'in return fonksiyonu ne zaman çalışır?
A) Mount olunca  
B) Her render öncesi  
C) Unmount olunca ve dependency değişmeden önce  
D) Hiçbir zaman  

---

### Soru 35
Hangisi doğrudur?
A) Hook'lar if/for içinde kullanılabilir  
B) Hook'lar sadece class component'te kullanılır  
C) Hook'lar sadece component veya custom hook'un en üst seviyesinde kullanılır  
D) Hook'lar her yerde kullanılabilir  

---

### Soru 36
useState vs useRef farkı nedir?
A) İkisi de render tetikler  
B) useState render tetikler, useRef tetiklemez  
C) useRef render tetikler, useState tetiklemez  
D) İkisi de aynı şeyi yapar  

---

### Soru 37
useMemo ne yapar?
A) Fonksiyon referansını saklar  
B) Hesaplama sonucunu cache'ler, dependency değişmedikçe tekrar hesaplamaz  
C) State tutar  
D) API çağrısı yapar  

---

### Soru 38
React'ta state neden doğrudan değiştirilmez?
A) Performans için  
B) React değişikliği algılayamaz ve re-render tetiklenmez  
C) JavaScript izin vermez  
D) Güvenlik için  

---

### Soru 39
```tsx
<button onClick={handleClick()}>Tıkla</button>
```
Bu kodda ne yanlış?
A) Hiçbir şey yanlış  
B) handleClick hemen çağrılır, tıklamayı beklemez  
C) onClick string olmalı  
D) button yerine input olmalı  

---

### Soru 40
Custom hook ile normal fonksiyon arasındaki fark nedir?
A) Custom hook daha hızlıdır  
B) Custom hook içinde React hook'ları kullanılabilir  
C) Normal fonksiyon her yerde çalışır, custom hook sadece server'da  
D) Fark yoktur  

---

## BÖLÜM 5: CSS & HTML (Soru 41-50)

### Soru 41
Bir elemanı hem yatay hem dikey ortalamanın flexbox yolu?
A) `display:flex; align-items:center; justify-content:center`  
B) `display:flex; text-align:center`  
C) `display:flex; margin:auto`  
D) `display:flex; vertical-align:middle`  

---

### Soru 42
`flex-direction: column` olduğunda `justify-content` hangi ekseni kontrol eder?
A) Yatay  
B) Dikey  
C) İkisini birden  
D) Hiçbirini  

---

### Soru 43
CSS Specificity sırası (düşükten yükseğe)?
A) id > class > element > inline  
B) element < class < id < inline  
C) inline < id < class < element  
D) class < element < id < inline  

---

### Soru 44
`box-sizing: border-box` ne yapar?
A) Sadece content'i ölçer  
B) width/height padding ve border dahil olur  
C) Margin'i dahil eder  
D) Box'ı gizler  

---

### Soru 45
Grid'de `1fr` ne demek?
A) 1 piksel  
B) Kalan alanın 1 kesiri (fraction)  
C) 1 satır  
D) 1 yüzde  

---

### Soru 46
React'ta inline style nasıl yazılır?
A) `style="color: red"`  
B) `style={{ color: "red" }}`  
C) `style={color: "red"}`  
D) `css={{ color: "red" }}`  

---

### Soru 47
Responsive design için hangisi kullanılır?
A) @font-face  
B) @media  
C) @import  
D) @keyframes  

---

### Soru 48
Hangisi semantic HTML değildir?
A) `<header>`  
B) `<nav>`  
C) `<div>`  
D) `<article>`  

---

### Soru 49
`position: absolute` olan eleman neye göre konumlanır?
A) Viewport'a  
B) En yakın `position: relative` olan parent'a  
C) Sayfanın başına  
D) Kendi orijinal yerine  

---

### Soru 50
React'ta `className` neden `class` yerine kullanılır?
A) Performans için  
B) `class` JavaScript'te reserved keyword olduğu için  
C) CSS'te çakışma olmaması için  
D) React kuralı, sebebi yok  
