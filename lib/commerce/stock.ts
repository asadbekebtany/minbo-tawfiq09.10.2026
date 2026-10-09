import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-error";

type Tx = Prisma.TransactionClient;

export async function syncProductStockFromVariants(tx: Tx, productId: string) {
  const variants = await tx.productVariant.findMany({
    where: { productId },
    select: { stock: true, reservedStock: true },
  });
  if (variants.length === 0) return;
  const stock = variants.reduce((sum, row) => sum + row.stock, 0);
  const reservedStock = variants.reduce((sum, row) => sum + row.reservedStock, 0);
  await tx.product.update({
    where: { id: productId },
    data: { stock, reservedStock },
  });
}

export async function reserveProductStock(
  tx: Tx,
  productId: string,
  quantity: number,
  reason: string,
  variantId?: string | null,
) {
  if (variantId) {
    const updated = await tx.productVariant.updateMany({
      where: { id: variantId, productId, stock: { gte: quantity } },
      data: {
        stock: { decrement: quantity },
        reservedStock: { increment: quantity },
      },
    });
    if (updated.count === 0) {
      throw new ApiError("OUT_OF_STOCK", "SKU omborda yetarli emas", 409);
    }
    await syncProductStockFromVariants(tx, productId);
    await tx.stockMovement.create({
      data: { productId, type: "reserve", quantity, reason: `${reason}:sku:${variantId}` },
    });
    return;
  }

  const updated = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: {
      stock: { decrement: quantity },
      reservedStock: { increment: quantity },
    },
  });
  if (updated.count === 0) {
    throw new ApiError("OUT_OF_STOCK", "Mahsulot omborda yetarli emas", 409);
  }
  await tx.stockMovement.create({
    data: { productId, type: "reserve", quantity, reason },
  });
}

export async function captureReservedStock(
  tx: Tx,
  productId: string,
  quantity: number,
  reason: string,
  variantId?: string | null,
) {
  if (variantId) {
    const updated = await tx.productVariant.updateMany({
      where: { id: variantId, productId, reservedStock: { gte: quantity } },
      data: { reservedStock: { decrement: quantity } },
    });
    if (updated.count === 0) {
      throw new ApiError("STOCK_CAPTURE_FAILED", "SKU reserved stock yetarli emas", 409);
    }
    await tx.product.update({
      where: { id: productId },
      data: { soldCount: { increment: quantity } },
    });
    await syncProductStockFromVariants(tx, productId);
  } else {
    const updated = await tx.product.updateMany({
      where: { id: productId, reservedStock: { gte: quantity } },
      data: {
        reservedStock: { decrement: quantity },
        soldCount: { increment: quantity },
      },
    });
    if (updated.count === 0) {
      throw new ApiError("STOCK_CAPTURE_FAILED", "Reserved stock yetarli emas", 409);
    }
  }
  await tx.stockMovement.create({
    data: { productId, type: "out", quantity, reason },
  });
}

export async function releaseReservedStock(
  tx: Tx,
  productId: string,
  quantity: number,
  reason: string,
  variantId?: string | null,
) {
  if (variantId) {
    const updated = await tx.productVariant.updateMany({
      where: { id: variantId, productId, reservedStock: { gte: quantity } },
      data: {
        reservedStock: { decrement: quantity },
        stock: { increment: quantity },
      },
    });
    if (updated.count === 0) {
      throw new ApiError("STOCK_RELEASE_FAILED", "SKU reserved stock yetarli emas", 409);
    }
    await syncProductStockFromVariants(tx, productId);
  } else {
    const updated = await tx.product.updateMany({
      where: { id: productId, reservedStock: { gte: quantity } },
      data: {
        reservedStock: { decrement: quantity },
        stock: { increment: quantity },
      },
    });
    if (updated.count === 0) {
      throw new ApiError("STOCK_RELEASE_FAILED", "Reserved stock yetarli emas", 409);
    }
  }
  await tx.stockMovement.create({
    data: { productId, type: "release", quantity, reason },
  });
}

export async function restockOnCancel(
  tx: Tx,
  productId: string,
  quantity: number,
  reason: string,
  variantId?: string | null,
) {
  if (variantId) {
    const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return;
    const fromReserved = Math.min(variant.reservedStock, quantity);
    const remainder = quantity - fromReserved;
    if (fromReserved > 0) {
      await releaseReservedStock(tx, productId, fromReserved, reason, variantId);
    }
    if (remainder > 0) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: remainder } },
      });
      await tx.product.update({
        where: { id: productId },
        data: { soldCount: { decrement: remainder } },
      });
      await syncProductStockFromVariants(tx, productId);
      await tx.stockMovement.create({
        data: { productId, type: "return", quantity: remainder, reason },
      });
    }
    return;
  }

  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) return;
  const fromReserved = Math.min(product.reservedStock, quantity);
  const remainder = quantity - fromReserved;
  if (fromReserved > 0) {
    await releaseReservedStock(tx, productId, fromReserved, reason);
  }
  if (remainder > 0) {
    await tx.product.update({
      where: { id: productId },
      data: {
        stock: { increment: remainder },
        soldCount: { decrement: remainder },
      },
    });
    await tx.stockMovement.create({
      data: { productId, type: "return", quantity: remainder, reason },
    });
  }
}

export async function markDamagedStock(
  tx: Tx,
  productId: string,
  quantity: number,
  reason: string,
  variantId?: string | null,
) {
  if (variantId) {
    const updated = await tx.productVariant.updateMany({
      where: { id: variantId, productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (updated.count === 0) {
      throw new ApiError("OUT_OF_STOCK", "SKU omborda yetarli emas", 409);
    }
    await syncProductStockFromVariants(tx, productId);
  } else {
    const updated = await tx.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (updated.count === 0) {
      throw new ApiError("OUT_OF_STOCK", "Mahsulot omborda yetarli emas", 409);
    }
  }
  await tx.product.update({
    where: { id: productId },
    data: { damagedStock: { increment: quantity } },
  });
  await tx.stockMovement.create({
    data: { productId, type: "out", quantity, reason: reason || "damaged" },
  });
}

export async function restockReturnedItems(
  tx: Tx,
  items: Array<{ productId: string; quantity: number }>,
  reason: string,
) {
  for (const item of items) {
    await restockOnCancel(tx, item.productId, item.quantity, reason);
  }
}
