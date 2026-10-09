/**
 * Production cron: POST /api/jobs/expire-orders (admin session).
 * Local: npm run jobs:expire-orders — bu fayl expirePendingOrders() ni chaqiradi.
 */
import { expirePendingOrders } from "../lib/commerce/expire-orders.ts";

const result = await expirePendingOrders();
console.log(JSON.stringify(result));
