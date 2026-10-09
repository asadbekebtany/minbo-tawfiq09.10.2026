# Muhitlar: development · staging · production

TAVFIQ uchta deploy muhitini `APP_ENV` orqali ajratadi. Bu `NODE_ENV` dan alohida: Next.js `NODE_ENV` ni o‘zi boshqaradi, `APP_ENV` esa bizning deployment siyosatimiz.

## Tez tanlash

| Muhit | Fayl | Maqsad |
|---|---|---|
| Local dev | `.env.development.example` → `.env` | Demo OTP, JSON fallback |
| Staging | `.env.staging.example` | Pre-prod, staging banner, haqiqiy DB |
| Production | `.env.production.example` | Qattiq siyosat, SMS majburiy |

VPS deploy oqimi, PM2/systemd, nginx, backup, local upload persist: [`docs/deploy-vps.md`](deploy-vps.md)

```bash
cp .env.development.example .env    # local
npm run env:validate                # deploy oldidan tekshiruv
```

## APP_ENV siyosati

| Siyosat | development | staging | production |
|---|---|---|---|
| JSON/orders-store fallback | ✅ | ❌ | ❌ |
| OTP demo (`OTP_DEMO_CODES`) | ✅ | ⚠️ `ALLOW_STAGING_OTP_DEMO=true` | ❌ |
| `DATABASE_URL` majburiy | ❌ | ✅ | ✅ |
| Staging banner (UI) | ❌ | ✅ | ❌ |
| `LOCK_ADMIN_API=true` | ✅ | ✅ | ❌ |

## Majburiy secretlar (staging + production)

| O'zgaruvchi | Izoh |
|---|---|
| `APP_ENV` | `staging` yoki `production` |
| `NEXT_PUBLIC_APP_ENV` | `APP_ENV` bilan bir xil |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Min 32 belgi, placeholder emas |
| `NEXTAUTH_URL` | Deploy URL (`https://staging.tavfiq.uz`) |
| `NEXT_PUBLIC_APP_URL` | Client URL (odatda `NEXTAUTH_URL` bilan bir xil) |

## Production secretlar (platforma panelida)

Quyidagilarni **git repoga qo‘ymang** — Vercel / Docker / VPS secret store:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `CLOUDINARY_API_SECRET`
- `PAYME_SECRET_KEY` (production)
- `CLICK_SECRET_KEY`
- `SMS_API_PASSWORD`

## Staging OTP demo

Stagingda SMS integratsiyasi tayyor bo‘lmaguncha vaqtinchalik demo OTP:

```env
APP_ENV=staging
ALLOW_STAGING_OTP_DEMO=true
OTP_DEMO_CODES=1234
```

SMS sozlangandan keyin `ALLOW_STAGING_OTP_DEMO` ni olib tashlang va `OTP_DEMO_CODES` ni bo‘sh qoldiring.

## CI / deploy tekshiruvi

```bash
npm run env:validate
```

Build oldidan yoki CI pipeline da ishga tushiring. Xato bo‘lsa deploy to‘xtaydi.

```bash
npm run env:check-secrets   # .env git/ZIP/leak audit
npm run env:validate
```

## Xavfsizlik

`.env` commit/ZIP qilinmasligi, secret rotation va `NEXT_PUBLIC_` qoidalari: [`docs/env-security.md`](env-security.md)

## Runtime policy (kod)

- `lib/runtime-policy.ts` — siyosat matritsasi
- `lib/env.server.ts` — Zod validatsiya + startup tekshiruv
- `lib/env.client.ts` — faqat ruxsat etilgan `NEXT_PUBLIC_*`
- `lib/env-security.ts` — secret/public ajratish qoidalari
- `lib/db.ts` — `resolveDataSource()` fallback siyosati
