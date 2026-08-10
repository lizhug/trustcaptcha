import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    activeCustomer?: {
      id: string;
      name: string;
      slug: string;
    };
    role?: "ADMIN" | "DEVELOPER";
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    activeCustomer?: {
      id: string;
      name: string;
      slug: string;
    };
    role?: "ADMIN" | "DEVELOPER";
    sessionVersion?: number;
    userId?: string;
  }
}
