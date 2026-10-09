# TAVFIQ Marketplace

O'zbekistondagi avtomobil ehtiyot qismlari marketplace'i.
Next.js 16 · TypeScript · Prisma · PostgreSQL · NextAuth v5 · Tailwind CSS

---

## Brend (TAVFIQ)

Yagona brend nomi markaziy helperlar orqali boshqariladi:

| Manba | Vazifa |
|---|---|
| `lib/site-settings-constants.ts` | Default: **TAVFIQ** |
| `lib/brand.ts` | Sarlavha, copyright, marketplace label |
| `lib/site-settings.ts` | DB/JSON sozlamalar + legacy **MAVLON** migratsiyasi |
| `GET /api/site-settings` | Client komponentlar (header, login, seller register) |
| `PUT /api/site-settings` | Admin brend sozlamalarini yangilash (Zod + role tekshiruv) |
| `data/site-settings.json` | DB yo‘q bo‘lganda fallback |

Admin panel → **Sozlamalar** (`/admin/settings`) orqali `siteName` va `siteShortName` o‘zgartiriladi.

---

## Tez ishga tushirish

```bash
# 1. Klonlash
git clone <repo-url>
cd tavfiq-marketplace

# 2. Paketlarni o'rnatish
npm install

# 3. Environment faylni sozlash (xavfsiz — mavjud .env ustiga yozmaydi)
npm run env:setup
# Keyin NEXTAUTH_SECRET yangilang: openssl rand -base64 32

# 3b. Muhit tekshiruvi
npm run env:check-secrets
npm run env:validate

# 4. Prisma client generatsiya
npx prisma generate

# 5. Database sxemasini push qilish
npx prisma db push

# 6. Seed data yuklash (development — demo katalog bilan)
npm run db:seed:dev

# 7. Dev serverni ishga tushirish
npm run dev
```

---

## Muhitlar (development · staging · production)

Loyiha `APP_ENV` orqali uchta deploy muhitini ajratadi (`NODE_ENV` dan alohida).

| Fayl | Maqsad |
|---|---|
| `.env.development.example` | Local dev (demo OTP, JSON fallback) |
| `.env.staging.example` | Pre-production (staging banner, haqiqiy DB) |
| `.env.production.example` | Production (qattiq siyosat, SMS majburiy) |
| `docs/environments.md` | To‘liq deployment qo‘llanmasi |

```bash
npm run env:validate   # CI / deploy oldidan tekshiruv
```

**Staging/production talablari:** `DATABASE_URL`, haqiqiy `NEXTAUTH_SECRET`, `OTP_DEMO_CODES` bo‘sh (yoki SMS sozlangan), `LOCK_ADMIN_API=false`.

### Env xavfsizligi

`.env` faylini **git yoki ZIP ga qo‘ymang**. ZIP bilan kelgan bo‘lsa, barcha secretlarni almashtiring.

```bash
npm run env:setup          # .env yaratish (ustiga yozmaydi)
npm run env:check-secrets  # git/leak tekshiruvi
```

Batafsil: [`docs/env-security.md`](docs/env-security.md)

---

## .env sozlash

`.env.example` yoki `.env.development.example` faylini `.env` ga ko'chirib to'ldiring:

| O'zgaruvchi | Tavsif | Majburiy |
|---|---|---|
| `APP_ENV` | `development` \| `staging` \| `production` | ✅ Ha |
| `NEXT_PUBLIC_APP_ENV` | Client banner — `APP_ENV` bilan bir xil | ✅ Ha |
| `DATABASE_URL` | PostgreSQL connection string | Staging/prod: ✅ |
| `NEXTAUTH_SECRET` | JWT imzolash kaliti (min 32 char) | ✅ Ha |
| `NEXTAUTH_URL` | App URL | ✅ Ha |
| `CLOUDINARY_*` | Rasm yuklash | Kerakli emas (URL input ishlaydi) |
| `PAYME_*` | Payme to'lov | Kerakli emas (mock ishlaydi) |
| `CLICK_*` | Click to'lov | Kerakli emas (mock ishlaydi) |
| `SMS_*` | SMS OTP | Kerakli emas (1234 kod ishlaydi) |

`NEXTAUTH_SECRET` yaratish:
```bash
openssl rand -base64 32
```

---

## Production build

```bash
npm run env:check-secrets
npm run env:validate
npm run build
npm start
```

Yoki bitta buyruq (CI bilan bir xil ketma-ketlik):

```bash
npm run ci
```

---

## CI/CD (GitHub Actions)

Har bir `push` va `pull_request` (main / master / develop) da avtomatik tekshiruv:

| Qadam | Buyruq |
|---|---|
| Env xavfsizlik | `npm run env:check-secrets` |
| Env validatsiya | `npm run env:validate` |
| Prisma schema | `npm run db:validate` |
| Migration fayllari | `npm run db:migrate:check-offline` |
| Prisma client | `npx prisma generate` |
| Lint | `npm run lint` |
| Build | `npm run build` |

Workflow fayli: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

CI da haqiqiy `.env` ishlatilmaydi — workflow ichida xavfsiz placeholder env beriladi.

---

## PostgreSQL ulanishi

Loyiha Prisma orqali PostgreSQL bilan ishlaydi. Development da DB yo‘q bo‘lsa, ba’zi o‘qish APIlari JSON/mock fallback ishlatadi; staging/production da DB majburiy.

### Docker (tavsiya etiladi)

Docker Desktop o‘rnatilgan bo‘lsa:

```bash
npm run db:setup    # postgres konteyner + migrate + seed
npm run db:ping     # port va Prisma ulanishini tekshirish
npm run db:up       # faqat konteynerni ishga tushirish
npm run db:down     # konteynerni to‘xtatish
```

`docker-compose.yml` — PostgreSQL 16, DB: `tavfiq`, port: `5432`.

### Mahalliy PostgreSQL

Docker bo‘lmasa, PostgreSQL 16 o‘rnating va bazani yarating:

```sql
CREATE DATABASE tavfiq;
```

`.env` da `DATABASE_URL` ni moslashtiring, keyin:

```bash
npx prisma migrate deploy
npm run db:seed:prod
npm run db:ping
```

### Health tekshiruv

| Manba | Maqsad |
|---|---|
| `GET /api/health/db` | Server: ulanish holati (dev da host/port) |
| `npm run db:ping` | CLI: port + Prisma `$queryRaw` |

---

## Prisma komandalar

```bash
# Schema o'zgartirilgandan keyin
npx prisma generate

# Migration fayllarini DBsiz tekshirish (CI ham shu buyruqni ishlatadi)
npm run db:migrate:check-offline

# PostgreSQL ishlayotganda to'liq tekshiruv (deploy + drift)
npm run db:migrate:verify

# Production/staging deploy
npm run db:migrate          # prisma migrate deploy
npm run db:migrate:status   # qo'llangan migrationlar

# Yangi migration yaratish (faqat development)
npx prisma migrate dev --name qisqa_tavsif
```

### Mavjud migrationlar

| Migration | Maqsad |
|---|---|
| `20260624000000_init_schema` | Asosiy schema (User, Product, Order, …) |
| `20260625010000_restore_hero_and_site_settings` | HeroSlide / SiteSetting patch |
| `20260625120000_brand_name_tavfiq` | Brend default: TAVFIQ |
| `20260626120000_phone_otp` | PhoneOtp jadvali (OTP auth) |
| `20260626140000_auth_rate_limit` | AuthRateLimitEvent (OTP rate limit) |
| `20260703100000_audit_log` | AuditLog jadvali (admin amallar tarixi) |

```bash
# DB sxemasini yangilash (dev-only, migration yozmasdan)
npx prisma db push

# Seed qayta yuklash
npm run db:seed:dev    # local demo katalog
npm run db:seed:prod   # production baseline (demo yo‘q)

# DB ni ko'rish (GUI)
npx prisma studio
```

---

## Demo loginlar

| Role | Telefon | SMS kod |
|---|---|---|
| Super Admin | +998712000000 | 1234 |
| Admin (Mahsulot) | +998712000001 | 1234 |
| Seller | +998712000002 | 1234 |
| Xaridor | +998901234567 | 1234 |

---

## Sahifalar

| URL | Tavsif | Kirish |
|---|---|---|
| `/` | Bosh sahifa | Hammaga |
| `/catalog` | Katalog + filter | Hammaga |
| `/product/[slug]` | Mahsulot detail | Hammaga |
| `/cart` | Savat | Hammaga |
| `/checkout` | Buyurtma | Hammaga |
| `/login` | Kirish | Tashqariga |
| `/profile` | Profil | Login kerak |
| `/profile/orders` | Buyurtmalar | Login kerak |
| `/profile/favorites` | Saralanganlar | Login kerak |
| `/profile/cars` | Avtomobillarim | Login kerak |
| `/seller/dashboard` | Seller panel | Seller role |
| `/seller/products` | Mahsulotlar | Seller role |
| `/seller/orders` | Buyurtmalar | Seller role |
| `/seller/analytics` | Statistika | Seller role |
| `/admin/dashboard` | Admin panel | Admin role |
| `/admin/products` | Mahsulotlar | Admin role |
| `/admin/categories` | Kategoriyalar | Admin role |
| `/admin/brands` | Brendlar | Admin role |
| `/admin/orders` | Buyurtmalar | Admin role |
| `/admin/users` | Foydalanuvchilar | Admin role |
| `/admin/sellers` | Sotuvchilar | Admin role |
| `/admin/banners` | Bannerlar | Admin role |
| `/admin/settings` | Sozlamalar | Admin role |

---

## API Routes

| Method | URL | Tavsif |
|---|---|---|
| GET | `/api/products` | Mahsulotlar (filter, sort, search) |
| GET | `/api/categories` | Kategoriyalar ro'yxati |
| GET | `/api/brands` | Brendlar ro'yxati |
| GET | `/api/search?q=` | Qidiruv |
| GET/POST/DELETE | `/api/cart` | Savat CRUD |
| GET/POST/PATCH | `/api/orders` | Buyurtmalar |
| GET/POST | `/api/favorites` | Saralanganlar |

---

## Mock bo'lgan qismlar (keyingi bosqich)

### 1. SMS OTP
**Fayl**: `components/auth/login-client.tsx`
```
// Hozir: kod 1234 yoki 0000 ishlaydi
// Kerak: Eskiz.uz yoki PlayMobile API
POST /api/auth/send-code  →  SMS_API_URL orqali yuborish
```

### 2. Payme
**Fayl**: `components/checkout/checkout-client.tsx`
```
// Hozir: "tez orada" placeholder
// Kerak: PAYME_MERCHANT_ID + webhook /api/payment/payme
```

### 3. Click
**Fayl**: `components/checkout/checkout-client.tsx`
```
// Hozir: "tez orada" placeholder
// Kerak: CLICK_SERVICE_ID + webhook /api/payment/click
```

### 4. Rasm yuklash
**Fayl**: `app/seller/products/add/page.tsx`
```
// Hozir: Unsplash URL ishlatiladi
// Kerak: Cloudinary widget yoki /api/upload endpoint
```

### 5. Real-time bildirishnomalar
```
// Hozir: yo'q
// Kerak: Pusher yoki WebSocket (buyurtma status o'zgarganda)
```

---

## Tech Stack

- **Framework**: Next.js 16.2 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **ORM**: Prisma 5.22 + PostgreSQL
- **Auth**: NextAuth v5 (JWT strategy)
- **State**: Zustand (cart, persist)
- **Validation**: Zod 4
- **Forms**: React Hook Form + @hookform/resolvers
- **Icons**: Lucide React

---

## Rol tizimi

| Role | Kirish huquqlari |
|---|---|
| `customer` | Profil, savat, buyurtma, sharh |
| `seller` | + Seller panel, o'z mahsulotlari |
| `admin` | + Admin panel, barcha ma'lumotlar |
| `super_admin` | Hamma narsa |

Admin ruxsatnomalar: `lib/permissions.ts` da 7 ta admin roli bilan granular tizim.

---

## Loyiha tuzilmasi

```
tavfiq-marketplace/
├── app/                    # Next.js App Router sahifalari
│   ├── admin/              # Admin panel (8 sahifa)
│   ├── api/                # API routes (7 endpoint)
│   ├── catalog/            # Katalog sahifalari
│   ├── profile/            # User profil (4 sahifa)
│   ├── seller/             # Seller panel (5 sahifa)
│   └── ...                 # product, cart, checkout, login
├── components/             # Reusable komponentlar
│   ├── admin/              # Admin sidebar
│   ├── auth/               # Login
│   ├── cart/               # Savat
│   ├── catalog/            # Catalog components
│   ├── checkout/           # Checkout stepper
│   ├── home/               # Homepage sections
│   ├── layout/             # Header, Footer, Menus
│   ├── product/            # Product card, grid, detail
│   ├── profile/            # Profile sidebar
│   ├── seller/             # Seller sidebar
│   └── ui/                 # Button, Badge, Rating, Skeleton
├── lib/                    # Utilities va konfiguratsiya
│   ├── brand.ts            # Brend nomi helperlari (TAVFIQ)
│   ├── site-settings.ts    # Sayt sozlamalari (DB + JSON fallback)
│   ├── cart-store.ts       # Zustand cart store
│   ├── mock-data.ts        # Dev mock mahsulotlar
│   ├── permissions.ts      # Role/permission tizimi
│   ├── prisma.ts           # Prisma singleton
│   └── utils.ts            # formatPrice, cn, slugify
├── prisma/
│   ├── schema.prisma       # 44 model, 10 enum
│   ├── seed.ts             # Seed entry (production / development)
│   └── seed-data/
│       ├── core.ts         # Kategoriya, brend, CMS, super admin
│       └── demo.ts         # Demo mahsulot, xaridor, seller
├── types/
│   └── index.ts            # TypeScript types
├── proxy.ts                # Role-based route protection
├── .env.example            # Environment o'zgaruvchilar
└── README.md
```
