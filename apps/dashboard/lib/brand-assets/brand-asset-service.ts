import { createHash } from "node:crypto";

import { getPrismaClient } from "@trustcaptcha/database";
import { getPlanEntitlements } from "@trustcaptcha/shared";

import type { AuthContext } from "../auth/session";

const MAX_IMAGE_BYTES = 1_500_000;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export class BrandAssetServiceError extends Error {
  constructor(
    readonly code:
      | "ASSET_LIMIT_REACHED"
      | "BRANDED_CHALLENGES_NOT_INCLUDED"
      | "DUPLICATE_ASSET"
      | "INVALID_IMAGE"
      | "NOT_FOUND"
      | "SITE_NOT_FOUND",
  ) {
    super(code);
  }
}

const assetSelection = {
  altText: true,
  byteSize: true,
  createdAt: true,
  id: true,
  mimeType: true,
  name: true,
  siteId: true,
  status: true,
} as const;

export async function listBrandAssets(context: AuthContext, siteId: string) {
  return getPrismaClient().brandAsset.findMany({
    where: { customerId: context.customerId, siteId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: assetSelection,
  });
}

export async function createBrandAsset(
  context: AuthContext,
  input: { altText: string; file: File; name: string; siteId: string },
) {
  const prisma = getPrismaClient();
  const [site, customer, assetCount] = await Promise.all([
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
    prisma.brandAsset.count({
      where: {
        customerId: context.customerId,
        siteId: input.siteId,
        status: "ACTIVE",
      },
    }),
  ]);
  if (!site) throw new BrandAssetServiceError("SITE_NOT_FOUND");
  const entitlements = getPlanEntitlements(customer.planTier);
  if (!entitlements.brandedChallenges) {
    throw new BrandAssetServiceError("BRANDED_CHALLENGES_NOT_INCLUDED");
  }
  if (assetCount >= entitlements.maxBrandAssets) {
    throw new BrandAssetServiceError("ASSET_LIMIT_REACHED");
  }
  if (
    !allowedImageTypes.has(input.file.type) ||
    input.file.size < 1 ||
    input.file.size > MAX_IMAGE_BYTES
  ) {
    throw new BrandAssetServiceError("INVALID_IMAGE");
  }

  const content = new Uint8Array(await input.file.arrayBuffer());
  if (!hasValidMagicBytes(content, input.file.type)) {
    throw new BrandAssetServiceError("INVALID_IMAGE");
  }
  const sha256 = createHash("sha256").update(content).digest("hex");

  try {
    return await prisma.$transaction(async (tx) => {
      const asset = await tx.brandAsset.create({
        data: {
          altText: input.altText,
          byteSize: content.byteLength,
          content,
          customerId: context.customerId,
          mimeType: input.file.type,
          name: input.name,
          sha256,
          siteId: input.siteId,
        },
        select: assetSelection,
      });
      await tx.auditLog.create({
        data: {
          action: "BRAND_ASSET_UPLOADED",
          actorType: "USER",
          actorUserId: context.userId,
          customerId: context.customerId,
          metadata: { byteSize: asset.byteSize, mimeType: asset.mimeType },
          targetId: asset.id,
          targetType: "BrandAsset",
        },
      });
      return asset;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new BrandAssetServiceError("DUPLICATE_ASSET");
    }
    throw error;
  }
}

export async function deleteBrandAsset(context: AuthContext, assetId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => {
    const result = await tx.brandAsset.updateMany({
      where: {
        customerId: context.customerId,
        id: assetId,
        status: "ACTIVE",
      },
      data: { status: "DISABLED" },
    });
    if (result.count !== 1) throw new BrandAssetServiceError("NOT_FOUND");
    await tx.auditLog.create({
      data: {
        action: "BRAND_ASSET_DELETED",
        actorType: "USER",
        actorUserId: context.userId,
        customerId: context.customerId,
        targetId: assetId,
        targetType: "BrandAsset",
      },
    });
  });
}

function hasValidMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/png") {
    return [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    );
  }
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}
