import { getPrismaClient } from "@trustcaptcha/database";
import {
  getPlanEntitlements,
  type UpsertVerificationPolicyInput,
} from "@trustcaptcha/shared";

import type { AuthContext } from "../auth/session";

export class VerificationPolicyServiceError extends Error {
  constructor(
    readonly code:
      | "BRANDED_CHALLENGES_NOT_INCLUDED"
      | "NOT_FOUND"
      | "SITE_NOT_FOUND",
  ) {
    super(code);
  }
}

const policySelection = {
  action: true,
  allowedChallenges: true,
  createdAt: true,
  failMode: true,
  id: true,
  immunitySeconds: true,
  maxAttempts: true,
  mode: true,
  preset: true,
  riskThreshold: true,
  siteId: true,
  updatedAt: true,
} as const;

export async function listVerificationPolicies(
  context: AuthContext,
  siteId: string,
) {
  return getPrismaClient().verificationPolicy.findMany({
    where: { customerId: context.customerId, siteId },
    orderBy: [{ action: "asc" }],
    select: policySelection,
  });
}

export async function upsertVerificationPolicy(
  context: AuthContext,
  input: UpsertVerificationPolicyInput,
) {
  const prisma = getPrismaClient();
  const [site, customer] = await Promise.all([
    prisma.site.findFirst({
      where: {
        customerId: context.customerId,
        deletedAt: null,
        id: input.siteId,
      },
      select: { id: true },
    }),
    prisma.customer.findUniqueOrThrow({
      where: { id: context.customerId },
      select: { planTier: true },
    }),
  ]);
  if (!site) throw new VerificationPolicyServiceError("SITE_NOT_FOUND");

  const normalized = normalizePreset(input);
  if (
    normalized.allowedChallenges.includes("VISUAL") &&
    !getPlanEntitlements(customer.planTier).brandedChallenges
  ) {
    throw new VerificationPolicyServiceError("BRANDED_CHALLENGES_NOT_INCLUDED");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.verificationPolicy.findUnique({
      where: {
        siteId_action: { action: normalized.action, siteId: normalized.siteId },
      },
      select: { id: true },
    });
    const policy = await tx.verificationPolicy.upsert({
      create: { ...normalized, customerId: context.customerId },
      update: normalized,
      where: {
        siteId_action: { action: normalized.action, siteId: normalized.siteId },
      },
      select: policySelection,
    });
    await tx.auditLog.create({
      data: {
        action: existing ? "POLICY_UPDATED" : "POLICY_CREATED",
        actorType: "USER",
        actorUserId: context.userId,
        customerId: context.customerId,
        metadata: {
          action: normalized.action,
          allowedChallenges: normalized.allowedChallenges,
          mode: normalized.mode,
          preset: normalized.preset,
        },
        targetId: policy.id,
        targetType: "VerificationPolicy",
      },
    });
    return policy;
  });
}

export async function deleteVerificationPolicy(
  context: AuthContext,
  policyId: string,
) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => {
    const policy = await tx.verificationPolicy.findFirst({
      where: { customerId: context.customerId, id: policyId },
      select: { action: true, id: true },
    });
    if (!policy || policy.action === "*") {
      throw new VerificationPolicyServiceError("NOT_FOUND");
    }
    await tx.verificationPolicy.delete({ where: { id: policy.id } });
    await tx.auditLog.create({
      data: {
        action: "POLICY_DELETED",
        actorType: "USER",
        actorUserId: context.userId,
        customerId: context.customerId,
        targetId: policy.id,
        targetType: "VerificationPolicy",
      },
    });
  });
}

function normalizePreset(input: UpsertVerificationPolicyInput) {
  if (input.preset === "CONVERSION") {
    return {
      ...input,
      allowedChallenges: ["POW"],
      mode: "INVISIBLE" as const,
    };
  }
  if (input.preset === "BALANCED") {
    return {
      ...input,
      allowedChallenges: ["POW", "CHECKBOX"],
      mode: "MANAGED" as const,
    };
  }
  if (input.preset === "STRICT") {
    return {
      ...input,
      allowedChallenges: ["POW", "CHECKBOX", "VISUAL"],
      mode: "CHECKBOX" as const,
    };
  }
  return input;
}
