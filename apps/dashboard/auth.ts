import { PrismaAdapter } from "@auth/prisma-adapter";
import { verify } from "@node-rs/argon2";
import { getPrismaClient } from "@trustcaptcha/database";
import { loginSchema } from "@trustcaptcha/shared";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

function isActiveCustomer(
  value: unknown,
): value is { id: string; name: string; slug: string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.slug === "string"
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth(() => {
  const prisma = getPrismaClient();

  return {
    adapter: PrismaAdapter(prisma),
    pages: {
      signIn: "/login",
    },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(rawCredentials) {
          const parsed = loginSchema.safeParse(rawCredentials);

          if (!parsed.success) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              status: true,
              memberships: {
                where: {
                  customer: { status: "ACTIVE" },
                  status: "ACTIVE",
                },
                take: 1,
              },
            },
          });

          if (
            !user?.passwordHash ||
            user.status !== "ACTIVE" ||
            user.memberships.length === 0
          ) {
            return null;
          }

          const passwordMatches = await verify(
            user.passwordHash,
            parsed.data.password,
          );

          if (!passwordMatches) {
            return null;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return { id: user.id, email: user.email, name: user.name };
        },
      }),
    ],
    session: {
      maxAge: 8 * 60 * 60,
      strategy: "jwt",
    },
    callbacks: {
      async jwt({ token, user }) {
        const userId =
          typeof user?.id === "string"
            ? user.id
            : typeof token.userId === "string"
              ? token.userId
              : undefined;

        if (!userId) {
          return token;
        }

        const account = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            id: true,
            image: true,
            name: true,
            sessionVersion: true,
            status: true,
            memberships: {
              where: {
                customer: { status: "ACTIVE" },
                status: "ACTIVE",
              },
              orderBy: { createdAt: "asc" },
              select: {
                customer: { select: { id: true, name: true, slug: true } },
                role: true,
              },
              take: 1,
            },
          },
        });

        const membership = account?.memberships[0];
        const tokenVersion =
          typeof token.sessionVersion === "number"
            ? token.sessionVersion
            : account?.sessionVersion;

        if (
          !account ||
          account.status !== "ACTIVE" ||
          !membership ||
          tokenVersion !== account.sessionVersion
        ) {
          token.userId = undefined;
          token.activeCustomer = undefined;
          token.role = undefined;
          return token;
        }

        token.userId = account.id;
        token.email = account.email;
        token.name = account.name;
        token.picture = account.image;
        token.activeCustomer = membership.customer;
        token.role = membership.role;
        token.sessionVersion = account.sessionVersion;

        return token;
      },
      session({ session, token }) {
        const activeCustomer = token.activeCustomer;

        if (
          typeof token.userId !== "string" ||
          !isActiveCustomer(activeCustomer) ||
          (token.role !== "ADMIN" && token.role !== "DEVELOPER")
        ) {
          return session;
        }

        session.user.id = token.userId;
        session.activeCustomer = activeCustomer;
        session.role = token.role;
        return session;
      },
    },
  };
});
