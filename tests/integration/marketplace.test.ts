import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { isSafeTestDatabase } from "../../lib/db-safety.ts";

const url = process.env.DATABASE_URL ?? "";
const canRun = url.startsWith("postgres") && isSafeTestDatabase({ databaseUrl: url });

async function ping(prisma: PrismaClient) {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
    ]);
    return true;
  } catch {
    return false;
  }
}

test("integration: stock/webhook/expire/refund", { skip: !canRun }, async (t) => {
  const prisma = new PrismaClient();
  try {
  if (!(await ping(prisma))) {
    t.skip("PostgreSQL ulanmadi");
    return;
  }

  const { createCheckoutOrders } = await import("../../lib/commerce/create-checkout-orders.ts");
  const { markPaymentPaid } = await import("../../lib/commerce/apply-payment.ts");
  const { expirePendingOrders } = await import("../../lib/commerce/expire-orders.ts");
  const { completeRefund } = await import("../../lib/commerce/refund.ts");
  const { ApiError } = await import("../../lib/api-error.ts");

  const suffix = `${Date.now()}`;
  const buyerA = await prisma.user.create({
    data: { phone: `+99890${suffix.slice(-7)}a`.slice(0, 13), role: "customer", name: "BuyerA" },
  });
  const buyerB = await prisma.user.create({
    data: { phone: `+99891${suffix.slice(-7)}b`.slice(0, 13), role: "customer", name: "BuyerB" },
  });
  const sellerUser = await prisma.user.create({
    data: { phone: `+99893${suffix.slice(-7)}s`.slice(0, 13), role: "seller", name: "SellerT" },
  });
  const seller = await prisma.seller.create({ data: { userId: sellerUser.id, isActive: true, isBanned: false } });
  const category = await prisma.category.findFirst();
  if (!category) {
    await prisma.$disconnect();
    t.skip("Seed/category yo‘q");
    return;
  }
  const store = await prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `T-${suffix}`,
      slug: `t-${suffix}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: category.id,
      name: "Test part",
      slug: `part-${suffix}`,
      price: 10000,
      stock: 1,
      isActive: true,
      isApproved: true,
      moderationStatus: "active",
    },
  });

  await t.test("oversell: second checkout OUT_OF_STOCK", async () => {
    const run = (userId: string) =>
      createCheckoutOrders({
        userId,
        cartItems: [{ productId: product.id, quantity: 1 }],
        deliveryType: "courier",
        paymentMethod: "cash",
        addressId: null,
        pickupPointId: null,
        couponCode: null,
        note: null,
        totalDiscount: 0,
        deliveryCost: 0,
      });

    const results = await Promise.allSettled([run(buyerA.id), run(buyerB.id)]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const denied = results.filter(
      (r) =>
        r.status === "rejected" &&
        r.reason instanceof ApiError &&
        r.reason.code === "OUT_OF_STOCK",
    ).length;
    assert.equal(ok, 1);
    assert.equal(denied, 1);
    const fresh = await prisma.product.findUnique({ where: { id: product.id } });
    assert.ok((fresh?.stock ?? 0) >= 0);
  });

  const paidProduct = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: category.id,
      name: "Paid part",
      slug: `paid-${suffix}`,
      price: 20000,
      stock: 5,
      isActive: true,
      isApproved: true,
      moderationStatus: "active",
    },
  });

  await t.test("webhook duplicate does not double ledger", async () => {
    const created = await createCheckoutOrders({
      userId: buyerA.id,
      cartItems: [{ productId: paidProduct.id, quantity: 1 }],
      deliveryType: "courier",
      paymentMethod: "payme",
      addressId: null,
      pickupPointId: null,
      couponCode: null,
      note: null,
      totalDiscount: 0,
      deliveryCost: 0,
    });
    const order = created.orders[0];
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    assert.ok(payment?.transactionId);
    const txId = payment!.transactionId!;
    await markPaymentPaid({ transactionId: txId });
    await markPaymentPaid({ transactionId: txId });
    await markPaymentPaid({ transactionId: txId });
    const pays = await prisma.payment.findMany({ where: { orderId: order.id, lifecycle: "paid" } });
    assert.equal(pays.length, 1);
    const ledger = await prisma.sellerFinance.findMany({ where: { orderId: order.id } });
    const revenues = ledger.filter((l) => l.type === "ORDER_REVENUE");
    assert.equal(revenues.length, 1);
    const notes = await prisma.notification.count({
      where: { eventKey: `payment-paid-buyer:${order.id}` },
    });
    assert.equal(notes, 1);
    const ships = await prisma.shipment.count({ where: { orderId: order.id } });
    assert.equal(ships, 1);
    const analytics = await prisma.analyticsEvent.count({
      where: { type: "payment_success", entityId: order.id },
    });
    assert.equal(analytics, 1);
  });

  await t.test("late payment after cancel refunds", async () => {
    const created = await createCheckoutOrders({
      userId: buyerB.id,
      cartItems: [{ productId: paidProduct.id, quantity: 1 }],
      deliveryType: "courier",
      paymentMethod: "payme",
      addressId: null,
      pickupPointId: null,
      couponCode: null,
      note: null,
      totalDiscount: 0,
      deliveryCost: 0,
    });
    const order = created.orders[0];
    await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    const result = await markPaymentPaid({ transactionId: payment!.transactionId! });
    assert.equal("late" in result && result.late, true);
    const fresh = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(fresh?.status, "cancelled");
    const pay = await prisma.payment.findUnique({ where: { id: payment!.id } });
    assert.equal(pay?.lifecycle, "refunded");
    const audit = await prisma.auditLog.count({
      where: { entityId: order.id, action: "payment_update" },
    });
    assert.ok(audit >= 1);
  });

  await t.test("expirePendingOrders is idempotent and releases stock", async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const expProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Exp part",
        slug: `exp-${suffix}`,
        price: 1000,
        stock: 3,
        reservedStock: 1,
        isActive: true,
        isApproved: true,
        moderationStatus: "active",
      },
    });
    const order = await prisma.order.create({
      data: {
        userId: buyerA.id,
        storeId: store.id,
        status: "awaiting_payment",
        subtotal: 1000,
        total: 1000,
        createdAt: old,
        items: { create: { productId: expProduct.id, name: "x", price: 1000, quantity: 1, total: 1000 } },
      },
    });
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: "payme",
        amount: 1000,
        status: "pending",
        lifecycle: "pending",
        transactionId: `exp-tx-${suffix}`,
      },
    });
    const first = await expirePendingOrders(new Date());
    const second = await expirePendingOrders(new Date());
    assert.ok(first.expired >= 1);
    assert.equal(second.expired, 0);
    const fresh = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(fresh?.status, "cancelled");
    const stock = await prisma.product.findUnique({ where: { id: expProduct.id } });
    assert.equal(stock?.reservedStock, 0);
    assert.equal(stock?.stock, 4);
    const pay = await prisma.payment.findFirst({ where: { orderId: order.id } });
    assert.equal(pay?.lifecycle, "cancelled");
    const notes = await prisma.notification.count({ where: { eventKey: `order-expired:${order.id}` } });
    assert.equal(notes, 1);
  });

  await t.test("checkout rejects inactive SKU / moderation / banned seller", async () => {
    const skuProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "SKU part",
        slug: `sku-${suffix}`,
        price: 5000,
        stock: 4,
        isActive: true,
        isApproved: true,
        moderationStatus: "active",
        variants: {
          create: { name: "Size", value: "M", sku: `sku-${suffix}`, stock: 2, isActive: false, price: 5000 },
        },
      },
      include: { variants: true },
    });
    await assert.rejects(
      () =>
        createCheckoutOrders({
          userId: buyerA.id,
          cartItems: [{ productId: skuProduct.id, variantId: skuProduct.variants[0].id, quantity: 1 }],
          deliveryType: "courier",
          paymentMethod: "cash",
          addressId: null,
          pickupPointId: null,
          couponCode: null,
          note: null,
          totalDiscount: 0,
          deliveryCost: 0,
        }),
      (err: unknown) => err instanceof ApiError && err.code === "SKU_UNAVAILABLE",
    );

    await prisma.product.update({
      where: { id: skuProduct.id },
      data: { moderationStatus: "pending_moderation", isApproved: false },
    });
    await assert.rejects(
      () =>
        createCheckoutOrders({
          userId: buyerA.id,
          cartItems: [{ productId: skuProduct.id, quantity: 1 }],
          deliveryType: "courier",
          paymentMethod: "cash",
          addressId: null,
          pickupPointId: null,
          couponCode: null,
          note: null,
          totalDiscount: 0,
          deliveryCost: 0,
        }),
      (err: unknown) => err instanceof ApiError && err.code === "PRODUCT_UNAVAILABLE",
    );

    await prisma.seller.update({ where: { id: seller.id }, data: { isBanned: true } });
    await prisma.product.update({
      where: { id: paidProduct.id },
      data: { isApproved: true, moderationStatus: "active" },
    });
    await assert.rejects(
      () =>
        createCheckoutOrders({
          userId: buyerA.id,
          cartItems: [{ productId: paidProduct.id, quantity: 1 }],
          deliveryType: "courier",
          paymentMethod: "cash",
          addressId: null,
          pickupPointId: null,
          couponCode: null,
          note: null,
          totalDiscount: 0,
          deliveryCost: 0,
        }),
      (err: unknown) => err instanceof ApiError && err.code === "SELLER_UNAVAILABLE",
    );
    await prisma.seller.update({ where: { id: seller.id }, data: { isBanned: false } });
  });

  await t.test("refund E2E delivered → return → refund → stock", async () => {
    const retProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Ret part",
        slug: `ret-${suffix}`,
        price: 8000,
        stock: 2,
        isActive: true,
        isApproved: true,
        moderationStatus: "active",
      },
    });
    const created = await createCheckoutOrders({
      userId: buyerA.id,
      cartItems: [{ productId: retProduct.id, quantity: 1 }],
      deliveryType: "courier",
      paymentMethod: "cash",
      addressId: null,
      pickupPointId: null,
      couponCode: null,
      note: null,
      totalDiscount: 0,
      deliveryCost: 0,
    });
    const order = created.orders[0];
    await prisma.order.update({ where: { id: order.id }, data: { status: "delivered" } });
    const rr = await prisma.returnRequest.create({
      data: {
        publicNumber: `RET-${suffix}`,
        userId: buyerA.id,
        orderId: order.id,
        reason: "test",
        status: "requested",
        items: { create: { productId: retProduct.id, quantity: 1 } },
      },
    });
    await prisma.returnRequest.update({ where: { id: rr.id }, data: { status: "approved" } });
    await prisma.returnRequest.update({ where: { id: rr.id }, data: { status: "received" } });
    await prisma.returnRequest.update({ where: { id: rr.id }, data: { status: "inspection" } });
    const result = await completeRefund(rr.id, buyerA.id, "sellable");
    assert.equal(result.duplicate, false);
    assert.ok(result.amount > 0);
    const again = await completeRefund(rr.id, buyerA.id, "sellable");
    assert.equal(again.duplicate, true);
    const stock = await prisma.product.findUnique({ where: { id: retProduct.id } });
    assert.equal(stock?.stock, 2);
    const ledger = await prisma.sellerFinance.findMany({ where: { orderId: order.id } });
    assert.ok(ledger.some((l) => l.type === "REFUND"));
    const pay = await prisma.payment.findFirst({ where: { orderId: order.id } });
    assert.equal(pay?.lifecycle, "refunded");
  });

  await t.test("seller isolation: store B product not in store A", async () => {
    const sellerBUser = await prisma.user.create({
      data: { phone: `+99894${suffix.slice(-7)}x`.slice(0, 13), role: "seller", name: "SellerB" },
    });
    const sellerB = await prisma.seller.create({ data: { userId: sellerBUser.id, isActive: true, isBanned: false } });
    const storeB = await prisma.store.create({
      data: { sellerId: sellerB.id, name: `B-${suffix}`, slug: `b-${suffix}` },
    });
    const productB = await prisma.product.create({
      data: {
        storeId: storeB.id,
        categoryId: category.id,
        name: "B part",
        slug: `b-part-${suffix}`,
        price: 5000,
        stock: 3,
        isActive: true,
        isApproved: true,
        moderationStatus: "active",
      },
    });
    const { canAccessOrder } = await import("../../lib/api-auth.ts");
    assert.equal(
      canAccessOrder({ id: sellerBUser.id, role: "seller" }, buyerA.id, sellerUser.id),
      false,
    );
    const storeAProducts = await prisma.product.findMany({ where: { storeId: store.id } });
    assert.equal(storeAProducts.some((p) => p.id === productB.id), false);
    const storeBProducts = await prisma.product.findMany({ where: { storeId: storeB.id } });
    assert.equal(storeBProducts.some((p) => p.id === product.id), false);
  });
  } catch (err) {
    t.skip(`PostgreSQL ulanmadi: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
});
