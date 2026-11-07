# Class-Based React Components — Acil Kılavuz

---

## 1. TEMEL YAPI

```tsx
import React, { Component } from "react";

class MyComponent extends Component {
  constructor(props) {
    super(props);          // ZORUNLU — props'u parent'a ilet
    this.state = {         // state BURADA tanımlanır
      count: 0,
      name: "",
    };
  }

  render() {              // ZORUNLU — JSX döndürür
    return (
      <div>
        <p>{this.state.count}</p>
        <p>{this.props.title}</p>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Artır
        </button>
      </div>
    );
  }
}
```

**Ezberle:**
- `extends Component`
- `constructor(props)` + `super(props)`
- `this.state = { ... }` (useState yerine)
- `this.setState({ ... })` (setX yerine)
- `render()` → JSX döndür
- Props: `this.props.xxx`
- State: `this.state.xxx`

---

## 2. LIFECYCLE METODLARI (useEffect karşılıkları)

```
                    MOUNT              UPDATE              UNMOUNT
                      │                  │                   │
              constructor()              │                   │
                      │                  │                   │
                  render()           render()                │
                      │                  │                   │
          componentDidMount()  componentDidUpdate()  componentWillUnmount()
```

### componentDidMount — Sayfa ilk açıldığında (useEffect(fn, []))

```tsx
componentDidMount() {
  // API çağrısı, event listener ekleme, timer başlatma
  fetch("/api/users")
    .then(res => res.json())
    .then(data => this.setState({ users: data }));
}
```

### componentDidUpdate — State veya props değişince (useEffect(fn, [dep]))

```tsx
componentDidUpdate(prevProps, prevState) {
  // Önceki değerle karşılaştır — sonsuz döngüden kaçın!
  if (prevState.userId !== this.state.userId) {
    this.fetchUser(this.state.userId);
  }
}
```

### componentWillUnmount — Component silinmeden önce (useEffect return)

```tsx
componentWillUnmount() {
  // Cleanup: timer, listener temizle
  clearInterval(this.timer);
  window.removeEventListener("resize", this.handleResize);
}
```

---

## 3. setState — State Güncelleme

```tsx
// Direkt değer:
this.setState({ count: 5 });

// Önceki değere göre (prevState):
this.setState(prevState => ({
  count: prevState.count + 1
}));

// ÖNEMLİ: setState MERGE yapar (spread gerekmez)
this.state = { name: "Ali", age: 25 };
this.setState({ age: 26 });
// Sonuç: { name: "Ali", age: 26 } — name kaybolmaz
```

**Dikkat:** `this.state.count = 5` YAPMA — render tetiklemez!

---

## 4. EVENT HANDLER

```tsx
class MyComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { text: "" };
    // Yöntem 1: bind (eski yol)
    this.handleClick = this.handleClick.bind(this);
  }

  // Yöntem 2: arrow function (modern, bind gereksiz)
  handleClick = () => {
    this.setState({ text: "clicked" });
  };

  handleChange = (e) => {
    this.setState({ text: e.target.value });
  };

  render() {
    return (
      <div>
        <input value={this.state.text} onChange={this.handleChange} />
        <button onClick={this.handleClick}>Tıkla</button>
      </div>
    );
  }
}
```

**Kural:** Arrow function kullan → `this` otomatik bağlanır, bind gerekmez.

---

## 5. PROPS

```tsx
class Greeting extends Component {
  render() {
    return <h1>Merhaba, {this.props.name}!</h1>;
  }
}

// Kullanım:
<Greeting name="Ali" />
```

### Default Props:

```tsx
class Greeting extends Component {
  static defaultProps = {
    name: "Misafir"
  };

  render() {
    return <h1>Merhaba, {this.props.name}!</h1>;
  }
}
```

---

## 6. TAM ÖRNEK — Fetch + Lifecycle

```tsx
class UserList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      loading: true,
      error: null,
    };
  }

  componentDidMount() {
    fetch("https://api.example.com/users")
      .then(res => res.json())
      .then(data => this.setState({ users: data, loading: false }))
      .catch(err => this.setState({ error: err.message, loading: false }));
  }

  componentWillUnmount() {
    // cleanup varsa buraya
  }

  render() {
    const { users, loading, error } = this.state;

    if (loading) return <p>Yükleniyor...</p>;
    if (error) return <p>Hata: {error}</p>;

    return (
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    );
  }
}
```

---

## 7. TAM ÖRNEK — Timer (mount + unmount)

```tsx
class Timer extends Component {
  constructor(props) {
    super(props);
    this.state = { seconds: 0 };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState(prev => ({ seconds: prev.seconds + 1 }));
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return <p>Geçen süre: {this.state.seconds}s</p>;
  }
}
```

---

## 8. TAM ÖRNEK — Controlled Input + Form

```tsx
class LoginForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
    };
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = (e) => {
    e.preventDefault();
    console.log(this.state.email, this.state.password);
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input
          name="email"
          type="email"
          value={this.state.email}
          onChange={this.handleChange}
        />
        <input
          name="password"
          type="password"
          value={this.state.password}
          onChange={this.handleChange}
        />
        <button type="submit">Giriş</button>
      </form>
    );
  }
}
```

---

## 9. HOOKS → CLASS Dönüşüm Tablosu

| Hooks (Functional) | Class |
|---|---|
| `useState(0)` | `this.state = { x: 0 }` |
| `setX(5)` | `this.setState({ x: 5 })` |
| `setX(prev => prev+1)` | `this.setState(prev => ({ x: prev.x+1 }))` |
| `useEffect(fn, [])` | `componentDidMount()` |
| `useEffect(fn, [dep])` | `componentDidUpdate(prevProps, prevState)` |
| `useEffect(() => { return cleanup }, [])` | `componentWillUnmount()` |
| `useRef(null)` | `this.myRef = React.createRef()` |
| `props.name` | `this.props.name` |

---

## 10. SINAV İPUÇLARI

1. **Her zaman `super(props)` yaz** — unutursan this.props undefined olur
2. **Arrow function handler** → this bağlama sorunu olmaz
3. **setState obje alır** — `this.setState({ key: value })`
4. **render() SADE olsun** — logic'i ayrı metoda koy
5. **componentDidUpdate'da IF kontrolü** — yoksa sonsuz döngü
6. **this.state'i direkt değiştirme** — her zaman setState kullan

---

## 11. SIK ÇIKAN SORULAR

### "componentDidMount vs constructor farkı?"
- constructor: state başlatma, bind
- componentDidMount: side effect (API, DOM, timer)

### "shouldComponentUpdate ne yapar?"
- `true` dönerse render çalışır, `false` dönerse render atlanır (performans)

### "PureComponent ne?"
- `shouldComponentUpdate`'i otomatik yapar (shallow compare)

### "render() ne zaman çalışır?"
- İlk mount + her setState/forceUpdate/props değişiminde

### "setState asenkron mu?"
- Evet — setState sonrası hemen this.state'e bakma, callback kullan:
```tsx
this.setState({ count: 1 }, () => {
  console.log(this.state.count); // 1 — burada güncel
});
```
