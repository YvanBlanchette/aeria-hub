import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      /** @param {{ email?: string, password?: string }} credentials */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!passwordsMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl;
        token.name = user.name;
        token.email = user.email;
      } else if (token.id) {
        // Re-read on every request (not just at sign-in) so profile/avatar/
        // password changes made from Settings show up without a re-login.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { name: true, email: true, role: true, avatarUrl: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.role = dbUser.role;
          token.avatarUrl = dbUser.avatarUrl;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.avatarUrl = token.avatarUrl;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
});
