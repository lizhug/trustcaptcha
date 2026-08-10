import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../lib/api/management-auth";
import {
  BrandAssetServiceError,
  createBrandAsset,
  listBrandAssets,
} from "../../../../lib/brand-assets/brand-asset-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeManagementRequest("brandAssets.read");
  if (!authorization.ok) return authorization.response;
  const siteId = new URL(request.url).searchParams.get("siteId");
  if (!siteId) return managementError(400, "SITE_ID_REQUIRED");
  return managementSuccess(
    await listBrandAssets(authorization.context, siteId),
  );
}

export async function POST(request: Request) {
  const authorization = await authorizeManagementRequest("brandAssets.write");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request)) {
    return managementError(403, "INVALID_ORIGIN");
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return managementError(400, "INVALID_FORM_DATA");
  }
  const file = formData.get("file");
  const siteId = formData.get("siteId");
  const name = formData.get("name");
  const altText = formData.get("altText");
  if (
    !(file instanceof File) ||
    typeof siteId !== "string" ||
    typeof name !== "string" ||
    typeof altText !== "string" ||
    !name.trim() ||
    !altText.trim()
  ) {
    return managementError(400, "INVALID_INPUT");
  }
  try {
    return managementSuccess(
      await createBrandAsset(authorization.context, {
        altText: altText.trim().slice(0, 180),
        file,
        name: name.trim().slice(0, 120),
        siteId,
      }),
      201,
    );
  } catch (error) {
    if (error instanceof BrandAssetServiceError) {
      const status = error.code === "INVALID_IMAGE" ? 400 : 403;
      return managementError(status, error.code);
    }
    console.error("Brand asset upload failed", error);
    return managementError(500, "INTERNAL_ERROR");
  }
}
