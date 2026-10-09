# Environment xavfsizligi

TAVFIQ loyihasida secretlar **faqat server** tomonda saqlanadi. `.env` fayli hech qachon git, ZIP yoki Docker image ichiga kirmasligi kerak.

## Asosiy qoidalar

| ✅ Qiling | ❌ Qilmang |
|---|---|
| `npm run env:setup` — birinchi marta `.env` yaratish | `.env` ni git ga commit qilish |
| Platform secret store (Vercel, VPS, Docker secrets) | `.env` ni ZIP/Telegram orqali tarqatish |
| Faqat `.env.*.example` shablonlarini commit qilish | `NEXT_PUBLIC_` prefiks bilan secret saqlash |
| Deploy oldidan `npm run env:check-secrets` | ZIP ichidagi `.env` ni ishlatish (secretlarni almashtiring) |

## ZIP orqali kelgan loyiha

Agar loyiha `.env` bilan ZIP ichida kelgan bo‘lsa:

1. **Barcha production secretlarni almashtiring** (`NEXTAUTH_SECRET`, `DATABASE_URL` paroli, SMS, to‘lov kalitlari).
2. `.env` ni git ga qo‘shmang — `.gitignore` allaqachon bloklaydi.
3. Yangi `NEXTAUTH_SECRET` yarating:
   ```bash
   openssl rand -base64 32
   ```
4. `npm run env:check-secrets` va `npm run env:validate` ishga tushiring.

## Ruxsat etilgan client o‘zgaruvchilar

Faqat quyidagilar `NEXT_PUBLIC_` prefiksida bo‘lishi mumkin (`lib/env-security.ts`):

- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (cloud name public, secret emas)

`NEXT_PUBLIC_DATABASE_URL`, `NEXT_PUBLIC_NEXTAUTH_SECRET` kabi nomlar startup da **xato** beradi.

## Server secretlari (NEXT_PUBLIC_ siz)

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `CLOUDINARY_API_SECRET`
- `PAYME_SECRET_KEY` / `PAYME_TEST_SECRET_KEY`
- `CLICK_SECRET_KEY`
- `SMS_API_PASSWORD`

## Tekshiruv buyruqlari

```bash
npm run env:setup          # .env yaratish (mavjud bo‘lsa ustiga yozmaydi)
npm run env:validate       # Zod/policy tekshiruvi
npm run env:check-secrets  # git tracking, public leak, shablon audit
```

CI pipeline tavsiyasi:

```bash
npm run env:check-secrets
npm run env:validate
npm run build
```

## Git hook (ixtiyoriy)

Commit oldidan `.env` staged emasligini tekshirish:

```bash
cp scripts/githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit   # Linux/macOS
```

Windows (Git Bash):

```bash
cp scripts/githooks/pre-commit .git/hooks/pre-commit
```

## Docker

`.dockerignore` `.env` ni image dan chiqaradi. Productionda secretlarni:

- `docker compose` → `env_file` yoki environment section (`.env` repoda emas)
- Kubernetes → Secrets
- Vercel → Environment Variables panel

## Kod manbalari

| Fayl | Vazifa |
|---|---|
| `lib/env.server.ts` | Server Zod + startup validatsiya |
| `lib/env.client.ts` | Faqat ruxsat etilgan public kalitlar |
| `lib/env-security.ts` | Secret/public ajratish qoidalari |
| `scripts/check-env-security.mjs` | Git/ZIP/leak audit |
| `scripts/setup-env.mjs` | Xavfsiz `.env` yaratish |
| `.gitignore` / `.gitattributes` / `.dockerignore` | Fayl darajasida himoya |
