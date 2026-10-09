export type Role = "customer" | "seller" | "pvz_operator" | "admin" | "super_admin";
export type AdminRoleType =
  | "super_admin"
  | "product_manager"
  | "order_manager"
  | "seller_manager"
  | "content_manager"
  | "support_manager"
  | "finance_manager";

export const PERMISSIONS: Record<AdminRoleType, string[]> = {
  super_admin: ["*"],
  product_manager: [
    "products.view", "products.create", "products.edit", "products.delete",
    "products.approve", "categories.view", "categories.create", "categories.edit",
    "brands.view", "brands.create", "brands.edit",
  ],
  order_manager: [
    "orders.view", "orders.edit", "orders.status", "returns.view", "returns.edit",
    "pickup_points.view", "pickup_points.edit",
  ],
  seller_manager: [
    "sellers.view", "sellers.approve", "sellers.ban", "seller_applications.view",
  ],
  content_manager: [
    "banners.view", "banners.create", "banners.edit", "banners.delete",
    "reviews.view", "reviews.approve", "reviews.delete",
    "questions.view", "questions.approve",
    "pickup_points.view", "pickup_points.edit",
  ],
  support_manager: [
    "tickets.view", "tickets.reply", "tickets.close",
    "users.view",
  ],
  finance_manager: [
    "payments.view", "finance.view", "commissions.view", "commissions.edit",
    "coupons.view", "coupons.create", "coupons.edit",
  ],
};

export function hasPermission(
  adminRole: AdminRoleType,
  permission: string
): boolean {
  const perms = PERMISSIONS[adminRole] ?? [];
  return perms.includes("*") || perms.includes(permission);
}

export function canSearchPvzCustomerPhone(role: Role | string): boolean {
  return canAccess(role as Role, "orders.pickup.phone");
}

export function canAccess(role: Role, resource: string): boolean {
  if (role === "super_admin") return true;

  const roleMap: Record<Role, string[]> = {
    super_admin: ["*"],
    admin: ["admin.*", "products.*", "orders.*", "users.view"],
    seller: ["seller.*", "products.own.*", "orders.own.*"],
    pvz_operator: ["pvz.*", "orders.pickup.*"],
    customer: ["profile.*", "cart.*", "orders.own", "favorites.*", "reviews.create"],
  };

  const perms = roleMap[role] ?? [];
  return perms.some((p) => p === "*" || p === resource || resource.startsWith(p.replace("*", "")));
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  customer: 1,
  pvz_operator: 2,
  seller: 3,
  admin: 4,
  super_admin: 5,
};

export function isAtLeast(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canAccessOrder(
  user: { id: string; role: string },
  orderUserId: string,
  orderStoreSellerUserId?: string,
): boolean {
  if (user.id === orderUserId) return true;
  if (orderStoreSellerUserId && user.id === orderStoreSellerUserId) return true;
  return user.role === "admin" || user.role === "super_admin";
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    customer: "Xaridor",
    seller: "Sotuvchi",
    pvz_operator: "PVZ operatori",
    admin: "Admin",
    super_admin: "Super Admin",
  };
  return labels[role] ?? role;
}

export function getAdminRoleLabel(role: AdminRoleType): string {
  const labels: Record<AdminRoleType, string> = {
    super_admin: "Super Admin",
    product_manager: "Mahsulot menejeri",
    order_manager: "Buyurtma menejeri",
    seller_manager: "Sotuvchi menejeri",
    content_manager: "Kontent menejeri",
    support_manager: "Support menejeri",
    finance_manager: "Moliya menejeri",
  };
  return labels[role] ?? role;
}
