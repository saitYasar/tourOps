# Promise / Async Soruları — Doğru Cevaplar

---

## 1. Sleep

```ts
function sleep(t) {
  return new Promise((resolve) => {
    setTimeout(resolve, t);
  });
}
```

---

## 2. Debounce

```ts
function debounce(fn, t) {
  let timer;

  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, t);
  };
}
```

---

## 3. Throttle

```ts
function throttle(fn, t) {
  let flag = false;

  return function (...args) {
    if (flag) return;

    fn(...args);
    flag = true;
    setTimeout(() => {
      flag = false;
    }, t);
  };
}
```

---

## 4. Memoize

```ts
function memoize(fn) {
  const memo = new Map();

  return function (...args) {
    const key = JSON.stringify(args);

    if (memo.has(key)) return memo.get(key);

    const sonuc = fn(...args);
    memo.set(key, sonuc);
    return sonuc;
  };
}
```

---

## 5. Add Two Promises

```ts
async function addTwoPromises(x, y) {
  const [a, b] = await Promise.all([x, y]);
  return a + b;
}
```

---

## 6. Timeout Cancellation

```ts
function cancellable(fn, args, t) {
  const timer = setTimeout(() => fn(...args), t);

  return function () {
    clearTimeout(timer);
  };
}
```

---

## 7. Interval Cancellation

```ts
function cancellable(fn, args, t) {
  fn(...args);
  const id = setInterval(() => fn(...args), t);

  return function () {
    clearInterval(id);
  };
}
```

---

## 8. Promise Time Limit

```ts
function timeLimit(fn, t) {
  return async function (...args) {
    return Promise.race([
      fn(...args),
      new Promise((_, reject) => {
        setTimeout(() => reject("Time Limit Exceeded"), t);
      }),
    ]);
  };
}
```

---

## 9. Cache With Time Limit

```ts
class TimeLimitedCache {
  cache = new Map();
  timers = new Map();

  set(key, value, duration) {
    const vardi = this.cache.has(key);

    if (vardi) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, value);
    this.timers.set(key, setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, duration));

    return vardi;
  }

  get(key) {
    return this.cache.has(key) ? this.cache.get(key) : -1;
  }

  count() {
    return this.cache.size;
  }
}
```
