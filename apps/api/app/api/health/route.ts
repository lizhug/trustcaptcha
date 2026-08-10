export const dynamic = "force-dynamic";

import { getPrismaClient } from "@trustcaptcha/database";

import { getRedisClient } from "../../../lib/redis/client";

export async function GET() {
  try {
    await Promise.all([
      getPrismaClient().$queryRawUnsafe("SELECT 1"),
      getRedisClient().ping(),
    ]);
    return Response.json({ service: "trustcaptcha-api", status: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json(
      { service: "trustcaptcha-api", status: "unavailable" },
      { status: 503 },
    );
  }
}
