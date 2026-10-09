/**
 * TAVFIQ Marketplace — Seed
 *
 * Rejimlar:
 *   SEED_MODE=production  — kategoriya, brend, CMS, super admin (demo mahsulot/xaridor yo‘q)
 *   SEED_MODE=development — production + demo katalog (default)
 *
 * Run:
 *   npm run db:seed:dev
 *   npm run db:seed:prod
 */

import { PrismaClient } from "@prisma/client";
import {
  BANNERS,
  BRANDS,
  CATEGORIES,
  HERO_SLIDES,
  PRODUCTION_PICKUP_POINTS,
  PRODUCTION_SUPER_ADMIN,
  SITE_SETTINGS,
} from "./seed-data/core";
import {
  DEMO_CAR_DATA,
  DEMO_COUPONS,
  DEMO_CUSTOMERS,
  DEMO_OTP_HINT,
  DEMO_PICKUP_POINTS,
  DEMO_PRODUCTS,
  DEMO_PVZ_OPERATOR,
  DEMO_REVIEW_TEXTS,
  DEMO_SELLERS,
  DEMO_STAFF_USERS,
  demoProductImageForCategory,
  demoSeededMetric,
  demoSeededRating,
} from "./seed-data/demo";

const prisma = new PrismaClient();

type SeedMode = "production" | "development";

type StaffSeedUser = {
  phone: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "seller" | "customer";
  adminRole: "super_admin" | "product_manager" | "order_manager" | "seller_manager" | "content_manager" | "support_manager" | "finance_manager";
  permissions: readonly string[];
};

type PickupPointSeed = {
  name: string;
  address: string;
  district: string;
  workHours: string;
  latitude: number;
  longitude: number;
  rating: number;
};

function resolveSeedMode(): SeedMode {
  const explicit = process.env.SEED_MODE?.trim().toLowerCase();
  if (explicit === "production" || explicit === "prod") return "production";
  if (explicit === "development" || explicit === "dev" || explicit === "demo") {
    return "development";
  }
  if (process.env.APP_ENV?.trim().toLowerCase() === "production") return "production";
  return "development";
}

function assertDemoSeedAllowed(mode: SeedMode) {
  const appEnv = process.env.APP_ENV?.trim().toLowerCase();
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (mode === "development" && (appEnv === "production" || nodeEnv === "production")) {
    throw new Error("Demo/development seed production muhitida ishlamaydi.");
  }
}

const DEMO_PHONE_ROLES: Record<string, string> = {
  "+998712000000": "super_admin",
  "+998712000001": "admin",
  "+998712000002": "seller",
  "+998712000003": "seller",
  "+998712000005": "seller",
  "+998712000006": "pvz_operator",
  "+998901234567": "customer",
  "+998911234567": "customer",
};

async function seedStaffUsers(staffUsers: readonly StaffSeedUser[]) {
  for (const staff of staffUsers) {
    const user = await prisma.user.upsert({
      where: { phone: staff.phone },
      update: {
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: true,
      },
      create: {
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        isActive: true,
      },
    });

    await prisma.admin.upsert({
      where: { userId: user.id },
      update: { role: staff.adminRole, permissions: [...staff.permissions] },
      create: {
        userId: user.id,
        role: staff.adminRole,
        permissions: [...staff.permissions],
      },
    });
  }
  console.log(`✅ ${staffUsers.length} ta admin foydalanuvchi`);
}

async function seedCategories() {
  const map: Record<string, { id: string }> = {};
  for (const cat of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        nameRu: cat.nameRu,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
      create: { ...cat, isActive: true },
    });
    map[cat.slug] = row;
  }
  console.log(`✅ ${CATEGORIES.length} ta kategoriya`);
  return map;
}

async function seedBrands() {
  const map: Record<string, { id: string }> = {};
  for (const brand of BRANDS) {
    const row = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        country: brand.country,
        sortOrder: brand.sortOrder,
        isActive: true,
      },
      create: { ...brand, isActive: true },
    });
    map[brand.slug] = row;
  }
  console.log(`✅ ${BRANDS.length} ta brend`);
  return map;
}

async function seedCarCatalog() {
  for (const makeData of DEMO_CAR_DATA) {
    const make = await prisma.carMake.upsert({
      where: { name: makeData.name },
      update: {},
      create: { name: makeData.name },
    });

    for (const modelData of makeData.models) {
      const model = await prisma.carModel.upsert({
        where: { makeId_name: { makeId: make.id, name: modelData.name } },
        update: {},
        create: { makeId: make.id, name: modelData.name },
      });

      let generation = await prisma.carGeneration.findFirst({
        where: { modelId: model.id, yearFrom: modelData.years[0] },
      });

      if (!generation) {
        generation = await prisma.carGeneration.create({
          data: {
            modelId: model.id,
            name: `${modelData.years[0]}–${modelData.years[1]}`,
            yearFrom: modelData.years[0],
            yearTo: modelData.years[1],
          },
        });
      }

      for (const engineName of modelData.engines) {
        const engine = await prisma.carEngine.findFirst({
          where: { generationId: generation.id, name: engineName },
        });
        if (!engine) {
          await prisma.carEngine.create({
            data: { generationId: generation.id, name: engineName },
          });
        }
      }
    }
  }
  console.log("✅ Demo avtomobil katalogi");
}

async function seedSellers() {
  const storeIds: string[] = [];

  for (const seller of DEMO_SELLERS) {
    const user = await prisma.user.upsert({
      where: { phone: seller.phone },
      update: {
        name: seller.name,
        email: seller.email,
        role: "seller",
        isActive: true,
      },
      create: {
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        role: "seller",
        isActive: true,
      },
    });

    const sellerRow = await prisma.seller.upsert({
      where: { userId: user.id },
      update: { isActive: true },
      create: { userId: user.id, isActive: true },
    });

    const store = await prisma.store.upsert({
      where: { slug: seller.slug },
      update: {
        name: seller.store,
        rating: seller.rating,
        reviewCount: seller.reviewCount,
        isVerified: true,
      },
      create: {
        sellerId: sellerRow.id,
        name: seller.store,
        slug: seller.slug,
        description: `${seller.store} — sifatli avtomobil mahsulotlari`,
        isVerified: true,
        city: "Toshkent",
        rating: seller.rating,
        reviewCount: seller.reviewCount,
      },
    });

    storeIds.push(store.id);
  }

  console.log(`✅ ${DEMO_SELLERS.length} ta demo sotuvchi`);
  return storeIds;
}

async function seedCustomers() {
  for (const customer of DEMO_CUSTOMERS) {
    await prisma.user.upsert({
      where: { phone: customer.phone },
      update: {
        name: customer.name,
        email: customer.email,
        role: "customer",
        isActive: true,
      },
      create: {
        ...customer,
        role: "customer",
        isActive: true,
      },
    });
  }
  console.log(`✅ ${DEMO_CUSTOMERS.length} ta demo xaridor`);
}

async function seedProducts(
  categories: Record<string, { id: string }>,
  brands: Record<string, { id: string }>,
  storeIds: string[],
) {
  let count = 0;

  for (let index = 0; index < DEMO_PRODUCTS.length; index++) {
    const product = DEMO_PRODUCTS[index];
    const category = categories[product.catSlug];
    const brand = brands[product.brandSlug];
    if (!category || storeIds.length === 0) continue;

    const storeId = storeIds[index % storeIds.length];
    const discount = product.oldPrice
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;
    const imageUrl = demoProductImageForCategory(product.catSlug);

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        price: product.price,
        oldPrice: product.oldPrice,
        discount,
        stock: product.stock,
        sku: product.oemNumber,
        oemNumber: product.oemNumber,
        isActive: true,
        isApproved: true,
        moderationStatus: "active",
        rating: demoSeededRating(index),
        reviewCount: demoSeededMetric(index, 12, 180),
        soldCount: demoSeededMetric(index, 40, 420),
      },
      create: {
        storeId,
        categoryId: category.id,
        brandId: brand?.id,
        name: product.name,
        slug: product.slug,
        sku: product.oemNumber,
        oemNumber: product.oemNumber,
        price: product.price,
        oldPrice: product.oldPrice,
        discount,
        stock: product.stock,
        isActive: true,
        isApproved: true,
        moderationStatus: "active",
        isFeatured: index % 3 === 0,
        rating: demoSeededRating(index),
        reviewCount: demoSeededMetric(index, 12, 180),
        soldCount: demoSeededMetric(index, 40, 420),
        warranty: "12 oy",
        returnPolicy: "14 kun",
        images: {
          create: [{ url: imageUrl, sortOrder: 0 }],
        },
      },
    });
    count++;
  }

  console.log(`✅ ${count} ta demo mahsulot`);
}

async function seedPickupPoints(points: readonly PickupPointSeed[]) {
  for (const point of points) {
    await prisma.pickupPoint.upsert({
      where: { name: point.name },
      update: {
        address: point.address,
        district: point.district,
        workHours: point.workHours,
        latitude: point.latitude,
        longitude: point.longitude,
        rating: point.rating,
        isActive: true,
      },
      create: {
        ...point,
        city: "Toshkent",
        isFree: true,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${points.length} ta pickup punkt`);
}

async function seedPvzOperator() {
  const user = await prisma.user.upsert({
    where: { phone: DEMO_PVZ_OPERATOR.phone },
    update: {
      name: DEMO_PVZ_OPERATOR.name,
      email: DEMO_PVZ_OPERATOR.email,
      role: "pvz_operator",
      isActive: true,
    },
    create: {
      name: DEMO_PVZ_OPERATOR.name,
      email: DEMO_PVZ_OPERATOR.email,
      phone: DEMO_PVZ_OPERATOR.phone,
      role: "pvz_operator",
      isActive: true,
    },
  });

  await prisma.admin.deleteMany({ where: { userId: user.id } });

  const point = await prisma.pickupPoint.findUnique({
    where: { name: DEMO_PVZ_OPERATOR.pickupPointName },
  });
  if (point) {
    await prisma.pickupPoint.update({
      where: { id: point.id },
      data: { operatorId: user.id },
    });
    console.log(`✅ PVZ operator ${DEMO_PVZ_OPERATOR.phone} → ${point.name}`);
    return;
  }
  console.log("⚠️ PVZ operator yaratildi, PickupPoint topilmadi");
}

async function seedBanners() {
  for (const banner of BANNERS) {
    await prisma.banner.upsert({
      where: { id: banner.id },
      update: {
        title: banner.title,
        titleRu: banner.titleRu,
        image: banner.image,
        link: banner.link,
        type: banner.type,
        sortOrder: banner.sortOrder,
        isActive: true,
      },
      create: { ...banner, isActive: true },
    });
  }
  console.log(`✅ ${BANNERS.length} ta banner`);
}

async function seedReviews() {
  const users = await prisma.user.findMany({
    where: { role: "customer" },
    take: DEMO_CUSTOMERS.length,
  });
  const products = await prisma.product.findMany({ take: DEMO_REVIEW_TEXTS.length });

  let count = 0;
  for (let i = 0; i < Math.min(users.length, products.length); i++) {
    const user = users[i];
    const product = products[i];
    const existing = await prisma.review.findFirst({
      where: { userId: user.id, productId: product.id },
    });
    if (!existing) {
      await prisma.review.create({
        data: {
          userId: user.id,
          productId: product.id,
          rating: 4 + (i % 2),
          comment: DEMO_REVIEW_TEXTS[i % DEMO_REVIEW_TEXTS.length],
          isApproved: true,
        },
      });
      count++;
    }
  }
  console.log(`✅ ${count} ta demo sharh`);
}

async function seedCoupons() {
  for (const coupon of DEMO_COUPONS) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        maxUses: coupon.maxUses,
        isActive: true,
      },
      create: { ...coupon, isActive: true },
    });
  }
  console.log(`✅ ${DEMO_COUPONS.length} ta demo kupon`);
}

async function seedMarketplaceRuntime() {
  await prisma.systemSetting.upsert({
    where: { key: "marketplace" },
    update: {},
    create: {
      key: "marketplace",
      value: {
        defaultCommission: 10,
        minPayout: 50_000,
        returnDays: 14,
        otpExpiryMinutes: 5,
        otpResendSeconds: 60,
        otpMaxAttempts: 5,
        otpMaxRequestsPerHour: 5,
        codEnabled: true,
        clickEnabled: true,
        paymeEnabled: true,
        reviewModeration: true,
        sellerAutoApproval: false,
        orderAutoCancelMinutes: 30,
        payoutHoldDays: 7,
      },
    },
  });

  const existing = await prisma.commission.findFirst({ where: { isDefault: true } });
  if (!existing) {
    await prisma.commission.create({ data: { rate: 10, isDefault: true } });
  }
  console.log("✅ SystemSetting + default Commission");
}

async function seedProductCatalogExtras() {
  const products = await prisma.product.findMany({
    where: { slug: { in: DEMO_PRODUCTS.map((p) => p.slug) } },
    include: { variants: true, stockMovements: true, compatibility: true },
  });
  const generation = await prisma.carGeneration.findFirst({
    include: { model: true },
  });

  for (const product of products) {
    const sku = product.sku || product.oemNumber;
    if (product.variants.length === 0 && sku) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: "Standart",
          value: "OEM",
          sku: `${sku}-STD`,
          stock: product.stock,
          price: product.price,
          isActive: true,
        },
      });
    }
    if (product.stockMovements.length === 0 && product.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "in",
          quantity: product.stock,
          reason: "demo seed",
        },
      });
    }
    if (generation && product.compatibility.length === 0) {
      await prisma.productCompatibility.create({
        data: {
          productId: product.id,
          generationId: generation.id,
          note: `${generation.model.name} ${generation.name}`,
        },
      });
    }
  }
  console.log("✅ SKU variant, stock movement, compatibility");
}

async function seedDemoCheckout() {
  const buyer = await prisma.user.findUnique({ where: { phone: "+998901234567" } });
  const store = await prisma.store.findUnique({ where: { slug: "autoparts-pro" } });
  const product = await prisma.product.findUnique({
    where: { slug: "michelin-energy-saver-205-55-r16" },
  });
  const point = await prisma.pickupPoint.findUnique({
    where: { name: DEMO_PVZ_OPERATOR.pickupPointName },
  });
  if (!buyer || !store || !product || !point) {
    console.log("⚠️ Demo order o‘tkazib yuborildi (buyer/store/product/PVZ yo‘q)");
    return;
  }

  const existing = await prisma.order.findUnique({ where: { publicNumber: "TF-DEMO-0001" } });
  if (existing) {
    console.log("✅ Demo order allaqachon mavjud");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        publicNumber: "TF-DEMO-0001",
        userId: buyer.id,
        storeId: store.id,
        pickupPointId: point.id,
        status: "in_transit",
        deliveryType: "pickup",
        paymentMethod: "cash",
        paymentStatus: "paid",
        subtotal: product.price,
        total: product.price,
        trackingNumber: "TF-TRK-DEMO-0001",
        commissionRate: 10,
        commissionAmount: Math.round(product.price * 0.1),
        sellerRevenue: product.price - Math.round(product.price * 0.1),
      },
    });
    await tx.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        skuSnapshot: product.sku,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price,
      },
    });
    await tx.payment.create({
      data: {
        orderId: order.id,
        method: "cash",
        amount: product.price,
        status: "paid",
        lifecycle: "paid",
        transactionId: "demo-pay-tf-0001",
        providerTransactionId: "demo-provider-tf-0001",
        paidAt: new Date(),
      },
    });
    await tx.shipment.create({
      data: {
        trackingNumber: "TF-TRK-DEMO-0001",
        orderId: order.id,
        status: "in_transit",
        toLabel: point.name,
      },
    });
    await tx.pvzParcel.create({
      data: {
        pickupPointId: point.id,
        orderId: order.id,
        status: "incoming",
      },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: "confirmed",
        toStatus: "in_transit",
        note: "demo seed",
      },
    });
  });
  console.log("✅ Demo order + payment + shipment + PVZ parcel");
}

async function assertDemoPhoneRoles() {
  const phones = Object.keys(DEMO_PHONE_ROLES);
  const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
  for (const user of users) {
    const expected = user.phone ? DEMO_PHONE_ROLES[user.phone] : null;
    if (expected && user.role !== expected) {
      throw new Error(`Demo telefon conflict: ${user.phone} role=${user.role}, kutilgan=${expected}`);
    }
  }
}

async function seedHeroSlides() {
  for (const slide of HERO_SLIDES) {
    await prisma.heroSlide.upsert({
      where: { id: slide.id },
      update: {
        title: slide.title,
        subtitle: slide.subtitle,
        description: slide.description,
        discountText: slide.discountText,
        buttonText: slide.buttonText,
        buttonUrl: slide.buttonUrl,
        imageUrl: slide.imageUrl,
        sortOrder: slide.sortOrder,
        isActive: true,
      },
      create: { ...slide, isActive: true },
    });
  }
  console.log(`✅ ${HERO_SLIDES.length} ta hero slayd`);
}

async function seedSiteSettings() {
  await prisma.siteSetting.upsert({
    where: { id: SITE_SETTINGS.id },
    update: {
      siteName: SITE_SETTINGS.siteName,
      siteShortName: SITE_SETTINGS.siteShortName,
      tagline: SITE_SETTINGS.tagline,
      email: SITE_SETTINGS.email,
      phone: SITE_SETTINGS.phone,
      address: SITE_SETTINGS.address,
      freeDeliveryMin: SITE_SETTINGS.freeDeliveryMin,
      commissionPercent: SITE_SETTINGS.commissionPercent,
      currency: SITE_SETTINGS.currency,
      primaryColor: SITE_SETTINGS.primaryColor,
      accentColor: SITE_SETTINGS.accentColor,
    },
    create: SITE_SETTINGS,
  });
  console.log("✅ Sayt sozlamalari");
}

async function runProductionSeed() {
  const phone = process.env.SUPER_ADMIN_PHONE?.trim();
  if (phone && phone !== PRODUCTION_SUPER_ADMIN.phone) {
    await seedStaffUsers([{ ...PRODUCTION_SUPER_ADMIN, phone }]);
  } else {
    console.log(
      "Production seed: demo super-admin (+998712000000) yaratilmadi. SUPER_ADMIN_PHONE ni o‘rnating.",
    );
  }
  await seedCategories();
  await seedBrands();
  await seedHeroSlides();
  await seedBanners();
  await seedSiteSettings();
  await seedPickupPoints(PRODUCTION_PICKUP_POINTS);
}

async function runDevelopmentSeed() {
  await seedStaffUsers(DEMO_STAFF_USERS);
  const categories = await seedCategories();
  const brands = await seedBrands();
  await seedHeroSlides();
  await seedBanners();
  await seedSiteSettings();
  await seedPickupPoints([...PRODUCTION_PICKUP_POINTS, ...DEMO_PICKUP_POINTS]);
  await seedPvzOperator();
  await seedCarCatalog();
  const storeIds = await seedSellers();
  await seedCustomers();
  await seedProducts(categories, brands, storeIds);
  await seedProductCatalogExtras();
  await seedMarketplaceRuntime();
  await seedDemoCheckout();
  await seedReviews();
  await seedCoupons();
  await assertDemoPhoneRoles();
}

function printSummary(mode: SeedMode) {
  console.log("\n✅ SEED MUVAFFAQIYATLI YAKUNLANDI!");
  console.log(`   Rejim: ${mode}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (mode === "production") {
    console.log("Production seed: kategoriya, brend, CMS.");
    console.log("Demo mahsulot/xaridor/seller/demo-super-admin yuklanmadi.");
    console.log("\nSuper admin uchun SUPER_ADMIN_PHONE ni .env da sozlang.");
    return;
  }

  console.log("Demo loginlar (SMS kod: " + DEMO_OTP_HINT + "):");
  console.log("  Super Admin: +998712000000");
  console.log("  Admin:       +998712000001");
  console.log("  Seller:      +998712000002");
  console.log("  PVZ:         +998712000006");
  console.log("  Xaridor:     +998901234567");
}

async function main() {
  const mode = resolveSeedMode();
  assertDemoSeedAllowed(mode);
  console.log(`🌱 Seed boshlandi (${mode})...\n`);

  if (mode === "production") {
    await runProductionSeed();
  } else {
    await runDevelopmentSeed();
  }

  printSummary(mode);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Noma'lum xato";
    console.error("❌ Seed xato:", message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
