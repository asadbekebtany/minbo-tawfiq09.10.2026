import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  inn: z.string().trim().min(5).max(20).optional().nullable(),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  address: z.string().trim().min(3).max(250).optional().nullable(),
  contactName: z.string().trim().min(2).max(120).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  const { error, user } = await requireSessionUser();
  if (error || !user) return error;

  if (!(await checkDatabaseConnection())) {
    return NextResponse.json({ error: "Database ulanmagan." }, { status: 503 });
  }

  try {
    const data = registerSchema.parse(await request.json());
    const contactName = data.contactName?.trim() || "Sotuvchi";

    const existing = await prisma.seller.findUnique({
      where: { userId: user.id },
      include: { application: true, store: true },
    });

    if (existing?.application?.status === "pending") {
      return NextResponse.json({ error: "Arizangiz allaqachon ko‘rib chiqilmoqda." }, { status: 409 });
    }
    if (existing?.isActive && existing.application?.status === "approved") {
      return NextResponse.json({ error: "Siz allaqachon tasdiqlangan sotuvchisiz." }, { status: 409 });
    }

    const seller =
      existing ??
      (await prisma.seller.create({
        data: { userId: user.id, isActive: false },
        include: { application: true, store: true },
      }));

    const application = await prisma.sellerApplication.upsert({
      where: { sellerId: seller.id },
      create: {
        sellerId: seller.id,
        companyName: data.companyName,
        inn: data.inn || null,
        contactName,
        phone: data.phone,
        email: data.email || null,
        description: data.description || data.address || null,
        status: "pending",
        rejectedReason: null,
      },
      update: {
        companyName: data.companyName,
        inn: data.inn || null,
        contactName,
        phone: data.phone,
        email: data.email || null,
        description: data.description || data.address || null,
        status: "pending",
        rejectedReason: null,
      },
    });

    if (!seller.store) {
      const baseSlug = slugify(data.companyName) || `store-${seller.id.slice(-6)}`;
      let slug = baseSlug;
      let n = 1;
      while (await prisma.store.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${n++}`;
      }
      await prisma.store.create({
        data: {
          sellerId: seller.id,
          name: data.companyName,
          slug,
          phone: data.phone,
          address: data.address || null,
          isVerified: false,
        },
      });
    }

    const { getRuntimeSettings } = await import("@/lib/system-settings");
    const settings = await getRuntimeSettings();
    const auto = settings.sellerAutoApproval;

    if (auto) {
      await prisma.seller.update({
        where: { id: seller.id },
        data: { isActive: true },
      });
      await prisma.sellerApplication.update({
        where: { id: application.id },
        data: { status: "approved" },
      });
      if (user.role === "customer") {
        await prisma.user.update({ where: { id: user.id }, data: { role: "seller" } });
      }
    }

    return NextResponse.json({ success: true, application, autoApproved: auto }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Arizani yuborib bo‘lmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
