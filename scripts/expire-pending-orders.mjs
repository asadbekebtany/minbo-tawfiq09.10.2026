/**
 * Development helper: expire awaiting_payment orders.
 * Production cron should POST /api/jobs/expire-orders with an admin session
 * or call expirePendingOrders() from a worker.
 *
 * Usage: npm run jobs:expire-orders
 */
import { expirePendingOrders } from "../lib/commerce/expire-orders.ts";

const result = await expirePendingOrders();
console.log(JSON.stringify(result));
