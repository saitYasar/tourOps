# CSS Flexbox & Grid — Çalışma Kağıdı

---

## 1. FLEXBOX — Tek Yönlü Yerleşim

Elemanları **bir satırda** veya **bir sütunda** hizalamak için.

### Başlatma

```css
.container {
  display: flex;
}
```

Bu kadar — child'lar artık yan yana dizilir.

---

### Ana Eksen (Main Axis) Yönü

```css
.container {
  flex-direction: row;            /* → varsayılan, soldan sağa */
  flex-direction: row-reverse;    /* ← sağdan sola */
  flex-direction: column;         /* ↓ yukarıdan aşağı */
  flex-direction: column-reverse; /* ↑ aşağıdan yukarı */
}
```

---

### justify-content — ANA EKSEN hizalama

```
row ise: ← → (yatay)
column ise: ↑ ↓ (dikey)
```

```css
.container {
  justify-content: flex-start;    /* |■ ■ ■      | sola yasla */
  justify-content: center;        /* |    ■ ■ ■  | ortala */
  justify-content: flex-end;      /* |      ■ ■ ■| sağa yasla */
  justify-content: space-between; /* |■    ■    ■| araya eşit boşluk */
  justify-content: space-around;  /* | ■   ■   ■ | etrafına eşit boşluk */
  justify-content: space-evenly;  /* |  ■  ■  ■  | tam eşit boşluk */
}
```

---

### align-items — ÇAPRAZ EKSEN hizalama

```
row ise çapraz eksen: ↑ ↓ (dikey)
column ise çapraz eksen: ← → (yatay)
```

```css
.container {
  align-items: stretch;     /* varsayılan — container boyunca uzar */
  align-items: flex-start;  /* üste yasla */
  align-items: center;      /* dikey ortala */
  align-items: flex-end;    /* alta yasla */
}
```

---

### Tam Ortala (En sık sorulan)

```css
.container {
  display: flex;
  justify-content: center;  /* yatay orta */
  align-items: center;      /* dikey orta */
}
```

---

### flex-wrap — Taşınca alt satıra geç

```css
.container {
  flex-wrap: nowrap;  /* varsayılan — tek satırda sıkış */
  flex-wrap: wrap;    /* taşarsa alt satıra geç */
}
```

---

### gap — Elemanlar arası boşluk

```css
.container {
  gap: 16px;          /* her yönde 16px */
  gap: 10px 20px;    /* satır 10px, sütun 20px */
}
```

---

### Child özellikleri

```css
.item {
  flex: 1;           /* eşit genişlik paylaş */
  flex: 2;           /* diğerlerinin 2 katı yer kapla */
  flex-shrink: 0;    /* küçülme — sıkışmasın */
  align-self: center; /* sadece bu elemanı dikey ortala */
}
```

---

## 2. GRID — İki Yönlü Yerleşim

Satır VE sütun aynı anda kontrol etmek için.

### Başlatma

```css
.container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;  /* 3 eşit sütun */
  grid-template-rows: 100px 200px;      /* 2 satır */
  gap: 16px;
}
```

---

### Sütun tanımlama

```css
/* 3 eşit sütun */
grid-template-columns: 1fr 1fr 1fr;
grid-template-columns: repeat(3, 1fr);  /* aynı şey, kısa hali */

/* Farklı genişlikler */
grid-template-columns: 200px 1fr 1fr;   /* ilk sütun sabit, diğerleri esnek */

/* Otomatik sığdır */
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
```

---

### fr birimi

`fr` = fraction (kesir). Kalan alanı paylaştırır:

```css
grid-template-columns: 1fr 2fr 1fr;
/* |  25%  |   50%   |  25%  | */
```

---

### Eleman yerleştirme

```css
.item {
  grid-column: 1 / 3;    /* 1. sütundan 3.'ye kadar kapla (2 sütun) */
  grid-row: 1 / 2;       /* 1. satır */
  grid-column: span 2;   /* 2 sütun kapla */
}
```

---

### Grid tam ortala

```css
.container {
  display: grid;
  place-items: center;  /* hem yatay hem dikey orta */
}
```

---

## 3. FLEXBOX vs GRID

| Flexbox | Grid |
|---------|------|
| Tek yön (satır VEYA sütun) | İki yön (satır VE sütun) |
| İçerik öncelikli | Yapı öncelikli |
| Navbar, buton grubu, card içi | Sayfa layout, dashboard, galeri |

**Kural:** Tek satır/sütün → Flexbox. Tablo/ızgara yapısı → Grid.

---

## 4. RESPONSIVE DESIGN

### Media Queries

```css
/* Mobil önce (mobile-first) */
.container {
  flex-direction: column;  /* mobilde alt alta */
}

@media (min-width: 768px) {
  .container {
    flex-direction: row;   /* tablette yan yana */
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1200px;     /* geniş ekranda sınırla */
  }
}
```

### Yaygın breakpoint'ler

| Cihaz | min-width |
|-------|-----------|
| Mobil | 0 - 767px |
| Tablet | 768px |
| Desktop | 1024px |
| Geniş | 1280px |

---

## 5. CSS SPECIFICITY (Özgüllük)

Hangi CSS kuralı kazanır?

```
Inline style (style="")  → 1000 puan
#id                      → 100 puan
.class, [attr], :pseudo  → 10 puan
element (div, p, span)   → 1 puan
```

```css
/* 1 puan */
p { color: red; }

/* 10 puan — kazanır */
.text { color: blue; }

/* 100 puan — kazanır */
#title { color: green; }

/* 1000 puan — her zaman kazanır */
<p style="color: yellow">
```

**!important** → her şeyi ezer (kullanma, son çare)

---

## 6. BOX MODEL

```
┌─────────────── margin ───────────────┐
│  ┌─────────── border ─────────────┐  │
│  │  ┌─────── padding ─────────┐  │  │
│  │  │                         │  │  │
│  │  │       CONTENT           │  │  │
│  │  │                         │  │  │
│  │  └─────────────────────────┘  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

```css
/* Her zaman bunu kullan: */
* {
  box-sizing: border-box;  /* width = content + padding + border */
}
```

`border-box` olmadan: width sadece content'i kapsar → padding ekleyince taşar.

---

## 7. SIK SORULAN LAYOUT'LAR

### Navbar (Flexbox)

```css
.navbar {
  display: flex;
  justify-content: space-between;  /* logo sol, menü sağ */
  align-items: center;
  padding: 0 20px;
  height: 60px;
}
```

### Card Grid (Grid)

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
```

### Sticky Footer (Flexbox)

```css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;  /* ortadaki alan tüm boşluğu kaplar */
}
```

### Tam Ortalama (3 yol)

```css
/* 1. Flexbox */
display: flex; justify-content: center; align-items: center;

/* 2. Grid */
display: grid; place-items: center;

/* 3. Position */
position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
```

---

## 8. ÖZET TABLO

| Özellik | Ne yapar |
|---------|----------|
| `display: flex` | Flexbox başlat |
| `justify-content` | Ana eksen hizala |
| `align-items` | Çapraz eksen hizala |
| `flex: 1` | Eşit alan paylaş |
| `gap` | Elemanlar arası boşluk |
| `display: grid` | Grid başlat |
| `grid-template-columns` | Sütun tanımla |
| `1fr` | Kalan alanı paylaş |
| `place-items: center` | Grid tam ortala |
| `@media` | Responsive breakpoint |

---

## 9. PRATİK SORULAR

1. Bir navbar yaz: sol tarafta logo, sağ tarafta 3 link yan yana.
2. 3 sütunlu responsive card grid yaz: mobilde 1, tablette 2, desktop'ta 3 sütun.
3. Bir hero section yaz: tam ekran, içerik tam ortada.
