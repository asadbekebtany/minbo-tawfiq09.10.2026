import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error } = await requireSuperAdminApi();
  if (error) return error;
  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [orders, payments, sellers, users, products, variants, payouts, returns, shipments] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          OR: [
            { publicNumber: { contains: q, mode: "insensitive" } },
            { id: q },
            { trackingNumber: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 8,
        select: { id: true, publicNumber: true, trackingNumber: true, total: true, status: true },
      }),
      prisma.payment.findMany({
        where: {
          OR: [
            { transactionId: { contains: q, mode: "insensitive" } },
            { providerTransactionId: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 8,
        select: { id: true, transactionId: true, orderId: true, amount: true },
      }),
      prisma.seller.findMany({
        where: {
          OR: [
            { user: { phone: { contains: q } } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { store: { name: { contains: q, mode: "insensitive" } } },
            { store: { slug: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 8,
        include: { user: { select: { phone: true, name: true } }, store: { select: { id: true, name: true } } },
      }),
      prisma.user.findMany({
        where: { OR: [{ phone: { contains: q } }, { name: { contains: q, mode: "insensitive" } }] },
        take: 8,
        select: { id: true, phone: true, name: true, role: true },
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { oemNumber: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 8,
        select: { id: true, name: true, slug: true, sku: true, oemNumber: true },
      }),
      prisma.productVariant.findMany({
        where: { sku: { contains: q, mode: "insensitive" } },
        take: 8,
        select: { id: true, sku: true, productId: true, value: true, product: { select: { slug: true, name: true } } },
      }),
      prisma.payoutRequest.findMany({
        where: {
          OR: [
            { publicNumber: { contains: q, mode: "insensitive" } },
            { id: q },
          ],
        },
        take: 8,
        select: { id: true, publicNumber: true, amount: true, status: true },
      }),
      prisma.returnRequest.findMany({
        where: { publicNumber: { contains: q, mode: "insensitive" } },
        take: 8,
        select: { id: true, publicNumber: true, status: true, orderId: true },
      }),
      prisma.shipment.findMany({
        where: { trackingNumber: { contains: q, mode: "insensitive" } },
        take: 8,
        select: { id: true, trackingNumber: true, orderId: true, status: true },
      }),
    ]);

  const results = [
    ...orders.map((o) => ({
      type: "order",
      id: o.id,
      title: o.publicNumber ?? o.id,
      href: `/admin/orders/${o.id}`,
      meta: o.status,
    })),
    ...payments.map((p) => ({
      type: "payment",
      id: p.id,
      title: p.transactionId ?? p.id,
      href: `/admin/orders/${p.orderId}`,
      meta: String(p.amount),
    })),
    ...sellers.map((s) => ({
      type: "seller",
      id: s.id,
      title: s.store?.name ?? s.user.name ?? s.user.phone,
      href: `/admin/sellers/${s.id}`,
      meta: s.user.phone,
    })),
    ...users.map((u) => ({
      type: "user",
      id: u.id,
      title: u.name ?? u.phone,
      href: `/admin/users/${u.id}`,
      meta: u.role,
    })),
    ...products.map((p) => ({
      type: "product",
      id: p.id,
      title: p.name,
      href: `/admin/products/${p.id}`,
      meta: p.sku ?? p.oemNumber,
    })),
    ...variants.map((v) => ({
      type: "sku",
      id: v.id,
      title: v.sku ?? v.value,
      href: `/admin/products/${v.productId}`,
      meta: v.product.name,
    })),
    ...payouts.map((p) => ({
      type: "payout",
      id: p.id,
      title: p.publicNumber,
      href: `/super-admin/finance`,
      meta: p.status,
    })),
    ...returns.map((r) => ({
      type: "return",
      id: r.id,
      title: r.publicNumber ?? r.id,
      href: `/admin/returns`,
      meta: r.status,
    })),
    ...shipments.map((s) => ({
      type: "tracking",
      id: s.id,
      title: s.trackingNumber,
      href: `/admin/orders/${s.orderId}`,
      meta: s.status,
    })),
  ];

  return NextResponse.json({ results });
}
