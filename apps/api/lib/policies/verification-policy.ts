import { getPrismaClient } from "@trustcaptcha/database";

export async function resolveVerificationPolicy(
  siteId: string,
  action: string,
) {
  const prisma = getPrismaClient();
  const policy = await prisma.verificationPolicy.findFirst({
    orderBy: { action: "desc" },
    select: {
      allowedChallenges: true,
      failMode: true,
      maxAttempts: true,
      mode: true,
      preset: true,
      riskThreshold: true,
    },
    where: { action: { in: [action, "*"] }, siteId },
  });

  return (
    policy ?? {
      allowedChallenges: ["POW", "CHECKBOX"],
      failMode: "CLOSED",
      maxAttempts: 3,
      mode: "MANAGED",
      preset: "BALANCED",
      riskThreshold: null,
    }
  );
}

export async function selectBrandAsset(siteId: string) {
  const prisma = getPrismaClient();
  const candidates = await prisma.brandAsset.findMany({
    orderBy: { createdAt: "desc" },
    select: { altText: true, id: true },
    take: 20,
    where: { siteId, status: "ACTIVE" },
  });
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export function policyModeToPublicMode(
  mode: "MANAGED" | "CHECKBOX" | "INVISIBLE" | "NON_INTERACTIVE",
) {
  if (mode === "NON_INTERACTIVE") return "non-interactive" as const;
  return mode.toLowerCase() as "managed" | "checkbox" | "invisible";
}
