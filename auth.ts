import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

/**
 * Auth.js (NextAuth v5) — username/password for a small, fixed set of internal
 * accounts (management + team users seeded in the DB).
 *
 * Credentials provider requires the JWT session strategy (database sessions
 * are not supported for credentials), so we sign a stateless session cookie
 * with AUTH_SECRET instead of trusting a raw user id. No Prisma adapter is
 * needed: the app reads the fresh user (with role/team) from the DB per request
 * via `lib/auth.ts`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const username =
          typeof credentials?.username === "string"
            ? credentials.username.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!username || !password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: { username, isActive: true },
          include: { team: true }
        });

        if (
          !user ||
          (user.role === Role.TEAM && !user.team?.isActive) ||
          !(await verifyPassword(password, user.passwordHash))
        ) {
          return null;
        }

        return { id: String(user.id), name: user.name };
      }
    })
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
});
