import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

export function createPrismaClient(databaseUrl: string) {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

export type TrustCaptchaPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  trustCaptchaPrisma?: TrustCaptchaPrismaClient;
};

export function getPrismaClient(): TrustCaptchaPrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to access TrustCaptcha data");
  }

  if (!globalForPrisma.trustCaptchaPrisma) {
    globalForPrisma.trustCaptchaPrisma = createPrismaClient(databaseUrl);
  }

  return globalForPrisma.trustCaptchaPrisma;
}
