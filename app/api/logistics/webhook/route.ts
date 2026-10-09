import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import { serverEnv } from "@/lib/env.server";
import { getLogisticsProvider } from "@/lib/providers/logistics-provider";
import { WebhookAuthError } from "@/lib/providers/errors";
import prisma from "@/lib/prisma";
import type { ShipmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS: Record<string, ShipmentStatus> = {
  created: "created",
  packed: "packed",
  shipped: "shipped",
  in_transit: "in_transit",
  arrived: "arrived",
  arrived_pvz: "arrived",
  delivered: "delivered",
  cancelled: "cancelled",
  returned: "returned",
};

export async function POST(request: Request) {
  if (serverEnv.isProduction && !serverEnv.logistics.webhookSecret) {
    return NextResponse.json(
      { success: false, code: "WEBHOOK_AUTH_FAILED", message: "LOGISTICS_WEBHOOK_SECRET majburiy" },
      { status: 401 },
    );
  }
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ success: false, code: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const event = await getLogisticsProvider().handleWebhook(body, request.headers);
    if (event.trackingNumber && STATUS[event.status]) {
      await prisma.shipment.updateMany({
        where: { trackingNumber: event.trackingNumber },
        data: { status: STATUS[event.status] },
      });
    }
    return NextResponse.json({ success: true, eventId: event.eventId });
  } catch (err) {
    if (err instanceof WebhookAuthError) {
      return NextResponse.json({ success: false, code: err.code, message: err.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: "Webhook xato" }, { status: 400 });
  }
}
