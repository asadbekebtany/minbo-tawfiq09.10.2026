# TAVFIQ — tiklash va yangilash hisoboti

## Tiklangan funksiyalar

- Hero slayder API: `GET/POST /api/hero-slides`
- Hero slayder tahrirlash/o‘chirish/tartiblash API
- Admin hero slayder sahifasi va jonli preview
- `HeroSlide` Prisma modeli va migration
- Sayt sozlamalari API va admin sahifasi
- `SiteSetting` Prisma modeli va migration
- Brendlar uchun doimiy JSON store, CRUD API va admin sahifasi
- Dinamik `TAVFIQ` brend komponenti
- O‘chib qolgan seller, help, pickup, huquqiy, profil va admin sahifalari

## Dizayn

- Qoramtir yashil + oltin milliy uslub
- Yuklangan ikat, ornament, oltin frame va hero stage rasmlari aynan saqlangan
- Referensdagi header, hero slider, avtomobil tanlash paneli, kategoriyalar va mahsulot kartalari
- Mobil va desktop responsive ko‘rinish

## Tekshiruv natijasi

- `npm run lint` — 0 xato, 0 warning
- `npm run build` — muvaffaqiyatli
- 51 ta Next.js route build qilindi

## Ishga tushirish

```bash
npm install
npx prisma generate
npm run dev
```

Database ulansa:

```bash
npx prisma migrate deploy
npm run seed
```

> `data/*.json` fayllari hero slayder, brend va sayt sozlamalari uchun database ulanmaguncha doimiy demo storage vazifasini bajaradi.
