import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db, dbRetry } from "@/db/index-postgres";
import { admins, partnerUsers, salons } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { rateLimit } from "./rate-limit";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email?: string;
    role?: string;
    salonId?: number;
    salonSlug?: string;
    salonName?: string;
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
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    salonId?: number;
    salonSlug?: string;
    salonName?: string;
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
          const [admin] = await db
            .select()
            .from(admins)
            .where(eq(admins.username, username))
            .limit(1);

          if (!admin || !admin.isActive) return null;

          const valid = await bcrypt.compare(password, admin.passwordHash);
          if (!valid) return null;

          return { id: admin.id.toString(), name: admin.name, role: "admin" };
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
      }
      return session;
    },
  },
};
