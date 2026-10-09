import { z } from "zod";

const intId = z.string().min(1);
const optionalNullableString = z.string().trim().min(1).optional().nullable();

export const productListQuerySchema = z.object({
  q: z.string().optional().default(""),
  category: z.string().optional().default(""),
  brand: z.string().optional().default(""),
  generationId: z.string().optional().default(""),
  sort: z.string().optional().default("popular"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  minPrice: z.coerce.number().int().min(0).default(0),
  maxPrice: z.coerce.number().int().min(0).default(999999999),
  mine: z.coerce.boolean().optional().default(false),
  admin: z.coerce.boolean().optional().default(false),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(2),
  nameRu: optionalNullableString,
  slug: z.string().trim().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: optionalNullableString,
  descriptionRu: optionalNullableString,
  categoryId: intId,
  brandId: optionalNullableString,
  price: z.coerce.number().int().min(0),
  oldPrice: z.coerce.number().int().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  sku: optionalNullableString,
  oemNumber: optionalNullableString,
  crossNumbers: z.array(z.string().trim().min(1)).optional().default([]),
  warranty: optionalNullableString,
  returnPolicy: optionalNullableString,
  weight: z.coerce.number().min(0).optional().nullable(),
  images: z.array(z.string().trim().min(1)).optional().default([]),
  isActive: z.boolean().optional().default(false),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  isApproved: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  moderationStatus: z.enum(["draft", "pending_moderation"]).optional(),
});

export const cartUpsertSchema = z.object({
  productId: intId,
  variantId: z.string().trim().min(1).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

export const cartPatchSchema = z.object({
  itemId: intId,
  quantity: z.coerce.number().int().min(0).max(999),
});

export const orderCreateSchema = z.object({
  deliveryType: z.enum(["courier", "pickup"]).default("courier"),
  paymentMethod: z.enum(["cash", "card", "payme", "click"]).default("cash"),
  addressId: z.string().trim().min(1).optional().nullable(),
  pickupPointId: z.string().trim().min(1).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  couponCode: z.string().trim().max(50).optional().nullable(),
  address: z
    .object({
      name: z.string().trim().min(2),
      phone: z.string().trim().min(7),
      city: z.string().trim().min(2).default("Toshkent"),
      district: z.string().trim().max(100).optional().nullable(),
      street: z.string().trim().min(2),
      building: z.string().trim().max(50).optional().nullable(),
      apartment: z.string().trim().max(50).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "awaiting_payment",
    "paid",
    "confirmed",
    "accepted",
    "preparing",
    "packing",
    "ready_for_shipment",
    "shipped",
    "in_transit",
    "ready_for_pickup",
    "at_pickup_point",
    "delivered",
    "cancelled",
    "return_requested",
    "return_approved",
    "returned",
    "refund_pending",
    "refunded",
  ]),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2),
  nameRu: optionalNullableString,
  slug: z.string().trim().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: optionalNullableString,
  image: optionalNullableString,
  icon: optionalNullableString,
  parentId: optionalNullableString,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const brandSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  logo: optionalNullableString,
  description: optionalNullableString,
  country: optionalNullableString,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const sellerApplicationSchema = z.object({
  companyName: z.string().trim().min(2),
  inn: optionalNullableString,
  contactName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  storeName: z.string().trim().min(2),
  storeSlug: z.string().trim().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const roleUpdateSchema = z.object({
  role: z.enum(["customer", "seller", "pvz_operator", "admin", "super_admin"]),
});

export const userBanUpdateSchema = z.object({
  isBanned: z.boolean(),
});

export const auditLogListQuerySchema = z.object({
  action: z
    .enum([
      "user_role_update",
      "user_ban_update",
      "order_status_update",
      "site_settings_update",
      "auth_login",
      "admin_role_update",
      "coupon_create",
      "coupon_update",
      "coupon_delete",
      "support_ticket_update",
      "return_status_update",
    ])
    .optional(),
  entityType: z.string().trim().min(1).optional(),
  actorId: z.string().trim().min(1).optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const siteSettingsUpdateSchema = z.object({
  siteName: z.string().trim().min(2, "Sayt nomi kamida 2 ta belgidan iborat bo‘lishi kerak").optional(),
  siteShortName: z
    .string()
    .trim()
    .min(2, "Qisqa nom kamida 2 ta belgidan iborat bo‘lishi kerak")
    .optional(),
  tagline: z.string().trim().min(1).optional(),
  email: z.string().trim().email("Email noto‘g‘ri").optional(),
  phone: z.string().trim().min(7).optional(),
  address: z.string().trim().min(2).optional(),
  freeDeliveryMin: z.coerce.number().int().min(0).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  currency: z.string().trim().min(1).optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Asosiy rang #RRGGBB formatida bo‘lishi kerak")
    .optional(),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Aksent rang #RRGGBB formatida bo‘lishi kerak")
    .optional(),
});

export const adminRoleUpdateSchema = z.object({
  adminRole: z.enum([
    "super_admin",
    "product_manager",
    "order_manager",
    "seller_manager",
    "content_manager",
    "support_manager",
    "finance_manager",
  ]),
});

export const couponCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Kupon kodi kamida 3 ta belgi")
    .max(32)
    .regex(/^[A-Z0-9_-]+$/i, "Faqat harf, raqam, - va _ ruxsat etiladi")
    .transform((v) => v.toUpperCase()),
  type: z.enum(["percentage", "fixed"]).default("percentage"),
  value: z.coerce.number().int().min(1),
  minOrder: z.coerce.number().int().min(0).optional().nullable(),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean().default(true),
  expiresAt: z.coerce.date().optional().nullable(),
}).refine(
  (data) => data.type !== "percentage" || data.value <= 100,
  { path: ["value"], message: "Foizli chegirma 100 dan oshmasligi kerak" },
);

export const couponUpdateSchema = z.object({
  type: z.enum(["percentage", "fixed"]).optional(),
  value: z.coerce.number().int().min(1).optional(),
  minOrder: z.coerce.number().int().min(0).optional().nullable(),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const supportTicketStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "closed"]),
});

export const supportReplySchema = z.object({
  message: z.string().trim().min(1, "Xabar bo'sh bo'lmasligi kerak").max(5000),
});

export const returnStatusSchema = z.object({
  status: z.enum([
    "pending",
    "requested",
    "approved",
    "awaiting_item",
    "received",
    "inspection",
    "refund_pending",
    "completed",
    "rejected",
    "cancelled",
  ]),
});

export function validationError(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      error: "Ma'lumotlar noto‘g‘ri yuborildi.",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
  }
  return { error: "Noma'lum xatolik" };
}
