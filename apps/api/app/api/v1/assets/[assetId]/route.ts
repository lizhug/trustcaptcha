import { getPrismaClient } from "@trustcaptcha/database";

type AssetRouteContext = { params: Promise<{ assetId: string }> };

export async function GET(_request: Request, context: AssetRouteContext) {
  const { assetId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) {
    return new Response(null, { status: 404 });
  }
  const asset = await getPrismaClient().brandAsset.findFirst({
    select: { byteSize: true, content: true, mimeType: true },
    where: {
      id: assetId,
      site: { deletedAt: null, status: "ACTIVE" },
      status: "ACTIVE",
    },
  });
  if (!asset) return new Response(null, { status: 404 });

  return new Response(Buffer.from(asset.content), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(asset.byteSize),
      "Content-Type": asset.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
