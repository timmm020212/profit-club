import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db, dbRetry } from "@/db/index-postgres";
import { admins, partnerUsers, salons, salonAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { rateLimit } from "./rate-limit";

// Pre-computed bcrypt hash used to equalize timing when no user is found.
// (Hash of "dummy" at cost 10 — value doesn't matter, just needs to be a valid bcrypt hash.)
const DUMMY_HASH = "$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email?: string;
    role?: string;
    salonId?: number;
    salonSlug?: string;
    salonName?: string;
    // Salon admin fields
    adminId?: number;
    perms?: {
      schedule: boolean;
      bookings: boolean;
      masters: boolean;
      bots: boolean;
      optimize: boolean;
      inventory: boolean;
    };
    forcePasswordReset?: boolean;
    issuedAt?: number;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email?: string;
      role?: string;
      salonId?: number;
      salonSlug?: string;
      salonName?: string;
      adminId?: number;
      perms?: {
        schedule: boolean;
        bookings: boolean;
        masters: boolean;
        bots: boolean;
        optimize: boolean;
        inventory: boolean;
      };
      forcePasswordReset?: boolean;
      issuedAt?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    salonId?: number;
    salonSlug?: string;
    salonName?: string;
    adminId?: number;
    perms?: {
      schedule: boolean;
      bookings: boolean;
      masters: boolean;
      bots: boolean;
      optimize: boolean;
      inventory: boolean;
    };
    forcePasswordReset?: boolean;
    issuedAt?: number;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    // Admin provider
    CredentialsProvider({
      id: "credentials",
      name: "Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username || "");
        const password = String(credentials?.password || "");

        const rl = rateLimit(`admin-login:${username}`, 5, 60 * 1000);
        if (!rl.ok) return null;
        if (!username || !password) return null;

        try {
          // 1. Try salon_admins first (the new per-salon role)
          const [sa] = await db.select().from(salonAdmins)
            .where(eq(salonAdmins.username, username))
            .limit(1);
          if (sa) {
            if (!sa.isActive || sa.archivedAt) {
              await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
              return null;
            }
            const valid = await bcrypt.compare(password, sa.passwordHash);
            if (!valid) return null;
            // Track last login (best-effort, don't fail auth if this fails)
            try {
              await db.update(salonAdmins)
                .set({ lastLoginAt: new Date() })
                .where(eq(salonAdmins.id, sa.id));
            } catch (e) { console.warn("lastLoginAt update failed:", e); }
            return {
              id: sa.id.toString(),
              name: sa.name,
              role: "salonAdmin",
              salonId: sa.salonId,
              adminId: sa.id,
              perms: {
                schedule:  sa.canEditSchedule,
                bookings:  sa.canEditBookings,
                masters:   sa.canEditMasters,
                bots:      sa.canEditBotFlows,
                optimize:  sa.canRunOptimization,
                inventory: sa.canEditInventory,
              },
              forcePasswordReset: sa.forcePasswordReset,
              issuedAt: Math.floor(Date.now() / 1000),
            };
          }

          // 2. Fallback: platform admin (legacy, god-mode in scoped queries)
          const [pa] = await db.select().from(admins)
            .where(eq(admins.username, username))
            .limit(1);
          if (!pa || !pa.isActive) {
            await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
            return null;
          }
          const valid = await bcrypt.compare(password, pa.passwordHash);
          if (!valid) return null;
          return {
            id: pa.id.toString(),
            name: pa.name,
            role: "admin",
            // Legacy admins have all perms (god mode); salonId stays undefined
            perms: { schedule: true, bookings: true, masters: true, bots: true, optimize: true, inventory: true },
            issuedAt: Math.floor(Date.now() / 1000),
          };
        } catch (error) {
          console.error("Admin auth error:", error);
          return null;
        }
      },
    }),

    // Partner provider
    CredentialsProvider({
      id: "partner",
      name: "Partner",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase().trim();
        const password = String(credentials?.password || "");

        const rl = rateLimit(`partner-login:${email}`, 5, 60 * 1000);
        if (!rl.ok) return null;

        if (!email || !password) return null;

        try {
          const user = await dbRetry(async () => {
            const [u] = await db.select().from(partnerUsers).where(eq(partnerUsers.email, email));
            return u;
          });
          if (!user) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          const salon = await dbRetry(async () => {
            const [s] = await db.select().from(salons).where(eq(salons.id, user.salonId));
            return s;
          });
          if (!salon || !salon.isActive) return null;

          return {
            id: user.id.toString(),
            name: salon.name,
            email: user.email,
            role: "partner",
            salonId: salon.id,
            salonSlug: salon.slug,
            salonName: salon.name,
          };
        } catch (error) {
          console.error("Partner auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        if (user.role === "partner") {
          token.salonId = user.salonId;
          token.salonSlug = user.salonSlug;
          token.salonName = user.salonName;
        }
        if (user.role === "salonAdmin" || user.role === "admin") {
          token.adminId = user.adminId;
          token.salonId = user.salonId;
          token.perms = user.perms;
          token.forcePasswordReset = user.forcePasswordReset;
          token.issuedAt = user.issuedAt;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role;
        if (token.role === "partner") {
          session.user.salonId = token.salonId;
          session.user.salonSlug = token.salonSlug;
          session.user.salonName = token.salonName;
        }
        if (token.role === "salonAdmin" || token.role === "admin") {
          session.user.adminId = token.adminId;
          session.user.salonId = token.salonId;
          session.user.perms = token.perms;
          session.user.forcePasswordReset = token.forcePasswordReset;
          session.user.issuedAt = token.issuedAt;
        }
      }
      return session;
    },
  },
};
