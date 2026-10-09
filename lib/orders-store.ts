import { readJsonFile, writeJsonFile } from "@/lib/json-store";

export type OrderItemRecord = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

export type OrderRecord = {
  id: string;
  userId: string;
  status: string;
  total: number;
  store: string;
  deliveryType: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItemRecord[];
};

const DEFAULT_ORDERS: OrderRecord[] = [
  {
    id: "ORD-ABC123",
    userId: "user-1-id",
    status: "delivered",
    total: 3_250_000,
    store: "AutoParts Pro",
    deliveryType: "courier",
    paymentMethod: "cash",
    createdAt: "2024-06-12T10:00:00.000Z",
    items: [
      {
        productId: "p1",
        name: "Michelin Energy Saver+ 205/55 R16",
        quantity: 2,
        price: 1_250_000,
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&q=60",
      },
      {
        productId: "p2",
        name: "Shell Helix Ultra 5W-40 4L",
        quantity: 1,
        price: 189_000,
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=80&q=60",
      },
    ],
  },
  {
    id: "ORD-DEF456",
    userId: "user-1-id",
    status: "shipped",
    total: 890_000,
    store: "ElectroAuto",
    deliveryType: "courier",
    paymentMethod: "card",
    createdAt: "2024-06-05T14:30:00.000Z",
    items: [
      {
        productId: "p3",
        name: "Bosch S5 60Ah 540A Akkumulyator",
        quantity: 1,
        price: 890_000,
        image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=80&q=60",
      },
    ],
  },
  {
    id: "ORD-GHI789",
    userId: "user-1-id",
    status: "pending",
    total: 420_000,
    store: "FilterShop",
    deliveryType: "pickup",
    paymentMethod: "cash",
    createdAt: "2024-05-28T09:15:00.000Z",
    items: [
      {
        productId: "p4",
        name: "Mann-Filter W 712/95 Moy filtri",
        quantity: 2,
        price: 45_000,
        image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=80&q=60",
      },
    ],
  },
];

function readOrders(): OrderRecord[] {
  return readJsonFile("orders.json", DEFAULT_ORDERS);
}

function writeOrders(orders: OrderRecord[]): void {
  writeJsonFile("orders.json", orders);
}

export function listOrders(userId?: string): OrderRecord[] {
  const orders = readOrders();
  const filtered = userId ? orders.filter((order) => order.userId === userId) : orders;
  return filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getOrderById(id: string): OrderRecord | undefined {
  return readOrders().find((order) => order.id === id);
}

export function createOrder(
  input: Omit<OrderRecord, "id" | "createdAt"> & { id?: string },
): OrderRecord {
  const orders = readOrders();
  const order: OrderRecord = {
    ...input,
    id: input.id ?? `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  writeOrders([order, ...orders]);
  return order;
}

export function updateOrderStatus(id: string, status: string): OrderRecord | undefined {
  const orders = readOrders();
  const index = orders.findIndex((order) => order.id === id);
  if (index < 0) return undefined;
  orders[index] = { ...orders[index], status };
  writeOrders(orders);
  return orders[index];
}
