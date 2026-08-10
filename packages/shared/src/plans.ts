export const planTiers = ["FREE", "PRO", "SCALE", "PRIVATE"] as const;
export type PlanTier = (typeof planTiers)[number];

export type PlanEntitlements = {
  brandedChallenges: boolean;
  dataRetentionDays: number;
  maxBrandAssets: number;
  maxSites: number;
  monthlyRequests: number;
  name: string;
  prioritySupport: boolean;
};

export const PLAN_ENTITLEMENTS: Record<PlanTier, PlanEntitlements> = {
  FREE: {
    brandedChallenges: false,
    dataRetentionDays: 14,
    maxBrandAssets: 0,
    maxSites: 3,
    monthlyRequests: 250_000,
    name: "Free",
    prioritySupport: false,
  },
  PRO: {
    brandedChallenges: true,
    dataRetentionDays: 90,
    maxBrandAssets: 20,
    maxSites: 25,
    monthlyRequests: 2_000_000,
    name: "Pro",
    prioritySupport: false,
  },
  SCALE: {
    brandedChallenges: true,
    dataRetentionDays: 365,
    maxBrandAssets: 100,
    maxSites: 100,
    monthlyRequests: 10_000_000,
    name: "Scale",
    prioritySupport: true,
  },
  PRIVATE: {
    brandedChallenges: true,
    dataRetentionDays: 3650,
    maxBrandAssets: 1000,
    maxSites: 10_000,
    monthlyRequests: 1_000_000_000,
    name: "Private Cloud",
    prioritySupport: true,
  },
};

export const PUBLIC_PLAN_PRICING = {
  FREE: { monthlyUsd: 0, yearlyUsd: 0 },
  PRO: { monthlyUsd: 9, yearlyUsd: 90 },
  SCALE: { monthlyUsd: 29, yearlyUsd: 290 },
  PRIVATE: { monthlyUsd: 199, yearlyUsd: 1990 },
} satisfies Record<PlanTier, { monthlyUsd: number; yearlyUsd: number }>;

export function getPlanEntitlements(tier: string): PlanEntitlements {
  return PLAN_ENTITLEMENTS[tier as PlanTier] ?? PLAN_ENTITLEMENTS.FREE;
}
