import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
  }
  
  interface Session {
    user: {
      id: string;
      name: string;
    };
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username || "");
        const password = String(credentials?.password || "");

        if (!username || !password) {
          return null;
        }

        try {
          const adminUsers = await db
            .select()
            .from(admins)
            .where(eq(admins.username, username))
            .limit(1);

          if (adminUsers.length === 0) {
            return null;
          }

          const admin = adminUsers[0];
          
          if (!admin.isActive) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
          
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: admin.id.toString(),
            name: admin.name,
          };
        } catch (error) {
          console.error("Auth error:", error);
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
};
