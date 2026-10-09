import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { writeAuditLog } from "@/lib/audit-log";
import { verifyPhoneOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { enforceAuthRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { resolveAuthUser, UserPersistenceError } from "@/lib/users";
import { isDevOnlyDemoAuthEnabled } from "@/lib/dev-demo-auth";
import { allowDemoPhonePrivilege, effectiveRole, isDemoSuperAdminPhone } from "@/lib/demo-staff";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import type { Role } from "@/lib/permissions";

async function isOtpValid(phone: string, code: string): Promise<boolean> {
  if (serverEnv.auth.otpDemoEnabled || isDevOnlyDemoAuthEnabled()) {
    if (serverEnv.auth.otpDemoCodes.includes(code)) return true;
  }

  if (serverEnv.sms.isConfigured) {
    const result = await verifyPhoneOtp(phone, code);
    return result.valid;
  }

  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: serverEnv.auth.secret,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Phone",
      credentials: {
        phone: { label: "Telefon", type: "tel" },
        code: { label: "Kod", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;

        const code = (credentials.code as string).trim();
        const phone = normalizePhone(credentials.phone as string);

        if (!(await isOtpValid(phone, code))) {
          return null;
        }

        try {
          return await resolveAuthUser(phone);
        } catch (error) {
          if (error instanceof UserPersistenceError) {
            console.error("[auth] resolveAuthUser:", error.message);
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "customer";
        token.phone = (user as { phone?: string }).phone ?? "";
      }

      if (token.id) {
        try {
          if (await checkDatabaseConnection()) {
            const row = await prisma.user.findUnique({
              where: { id: String(token.id) },
              select: {
                role: true,
                isBanned: true,
                isActive: true,
                phone: true,
                admin: { select: { role: true } },
              },
            });
            if (!row || row.isBanned || !row.isActive) {
              return {};
            }
            token.phone = row.phone ?? token.phone;
            const dbRole = (
              ["customer", "seller", "pvz_operator", "admin", "super_admin"] as const
            ).includes(row.role as Role)
              ? (row.role as Role)
              : "customer";
            token.role = effectiveRole(dbRole, row.phone, row.admin?.role);
          }
        } catch {
          /* token saqlanadi */
        }
      }

      if (allowDemoPhonePrivilege() && isDemoSuperAdminPhone(String(token.phone ?? ""))) {
        token.role = "super_admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        return { ...session, user: undefined };
      }
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { phone?: string }).phone = token.phone as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const role = (user as { role?: string }).role;
      if (role !== "admin" && role !== "super_admin" && role !== "seller") return;

      const userId = (user as { id?: string }).id;
      if (!userId) return;

      await writeAuditLog({
        actorId: userId,
        actorRole: role,
        action: "auth_login",
        entityType: "session",
        entityId: userId,
        metadata: {
          phone: (user as { phone?: string }).phone ?? null,
          role,
        },
      });
    },
  },
});

async function parseCredentialsPhone(request: NextRequest): Promise<string | null> {
  const url = new URL(request.url);
  if (request.method !== "POST") return null;
  if (!url.pathname.endsWith("/callback/credentials")) return null;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.clone().json()) as { phone?: string };
      if (!body.phone) return null;
      return normalizePhone(body.phone);
    }

    const text = await request.clone().text();
    const params = new URLSearchParams(text);
    const phone = params.get("phone");
    if (!phone) return null;
    return normalizePhone(phone);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const phone = await parseCredentialsPhone(request);

  if (phone) {
    const rateLimit = await enforceAuthRateLimit({
      scope: "auth-signin",
      ip: getClientIp(request),
      phone,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.message,
          retryAfterSec: rateLimit.retryAfterSec,
          rateLimited: true,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSec) },
        },
      );
    }
  }

  return handlers.POST(request);
}

export async function GET(request: NextRequest) {
  return handlers.GET(request);
}
