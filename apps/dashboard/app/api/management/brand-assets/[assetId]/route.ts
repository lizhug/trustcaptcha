import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../../lib/api/management-auth";
import {
  BrandAssetServiceError,
  deleteBrandAsset,
} from "../../../../../lib/brand-assets/brand-asset-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const authorization = await authorizeManagementRequest("brandAssets.write");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request)) {
    return managementError(403, "INVALID_ORIGIN");
  }
  try {
    const { assetId } = await context.params;
    await deleteBrandAsset(authorization.context, assetId);
    return managementSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof BrandAssetServiceError) {
      return managementError(404, error.code);
    }
    console.error("Brand asset deletion failed", error);
    return managementError(500, "INTERNAL_ERROR");
  }
}
