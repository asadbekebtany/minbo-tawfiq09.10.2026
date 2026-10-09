# TAVFIQ — VPS / Node production deploy

Rasmlar Cloudinarysiz, server diskida (`LOCAL_UPLOAD_DIR` yoki `data/uploads`).

## Production flow

```bash
# 1. code
git pull

# 2. dependencies
npm ci

# 3. Prisma client
npx prisma generate

# 4. schema (demo seed EMAS)
npx prisma migrate deploy
# ixtiyoriy, faqat CMS/super-admin: npm run db:seed:prod
# DEMO seed productionda taqiqlangan: npm run db:seed:dev

# 5. build
npm run build

# 6. start (PM2 yoki systemd)
npm run start
# yoki: pm2 start ecosystem.config.cjs
# yoki: sudo systemctl restart tavfiq
```

`APP_ENV=production` da `npm run db:seed:dev` va `npm run db:setup` to‘xtaydi. `npx prisma migrate deploy` seed ishlatmaydi.

## Majburiy env

| O‘zgaruvchi | Production |
|---|---|
| `APP_ENV` / `NEXT_PUBLIC_APP_ENV` | `production` |
| `DATABASE_URL` | `postgresql://USER:PASS@HOST:5432/tavfiq?schema=public&sslmode=require` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` (placeholder emas) |
| `NEXTAUTH_URL` | `https://tavfiq.uz` |
| `NEXT_PUBLIC_APP_URL` | `https://tavfiq.uz` |
| `OTP_DEMO_CODES` | bo‘sh |
| `STORAGE_PROVIDER` | `local` |
| `LOCAL_UPLOAD_DIR` | `/var/lib/tavfiq/uploads` (persist volume) |

Shablon: `.env.production.example`

## Health

| URL | Maqsad |
|---|---|
| `GET /api/health` | app liveness |
| `GET /api/health/db` | PostgreSQL readiness |

## Persist uploads

- Default ildiz: `data/uploads` (gitignore)
- Production: `LOCAL_UPLOAD_DIR=/var/lib/tavfiq/uploads` — git pull/build o‘chirmaydi
- Public URL: `/uploads/...` (`app/uploads/[...path]`)
- MIME + 5 MB limit: `app/api/upload/route.ts`

```bash
sudo mkdir -p /var/lib/tavfiq/uploads /var/www/tavfiq/logs /var/www/tavfiq/data/backups
sudo chown -R www-data:www-data /var/lib/tavfiq /var/www/tavfiq/data /var/www/tavfiq/logs
```

`rsync --delete` ishlatsangiz `data/uploads`, `/var/lib/tavfiq/uploads`, `logs`, `data/backups` ni exclude qiling.

## Process manager

- PM2: `pm2 start ecosystem.config.cjs` (log: `logs/out.log`, `logs/error.log`)
- systemd: `deploy/tavfiq.service` (`Restart=always`)

## Reverse proxy / HTTPS

- `deploy/nginx.conf.example` — TLS, `X-Forwarded-Proto`, `client_max_body_size 6m`
- NextAuth: `trustHost: true`
- App HSTS: `APP_ENV=production`

## Backup

```bash
export DATABASE_URL='postgresql://...'
bash scripts/backup-postgres.sh
```

Dump: `data/backups/` (yoki `BACKUP_DIR`). 14 ta dump saqlanadi (`BACKUP_KEEP`).

```bash
sudo cp deploy/tavfiq-backup.service deploy/tavfiq-backup.timer /etc/systemd/system/
sudo systemctl enable --now tavfiq-backup.timer
```

Yoki `deploy/crontab.example`. PostgreSQL o‘zini ham VPS snapshot qiling.

## Docker

`docker-compose.yml` faqat **local PostgreSQL**. App image yo‘q — VPS da `npm run start` / PM2.

## Runtime papkalar

`npm run start` oldidan `scripts/ensure-runtime-dirs.mjs` `data/uploads`, `logs`, `data/backups` yaratadi.
