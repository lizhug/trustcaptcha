import { verifyTokenSchema } from "@trustcaptcha/shared";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { errorCodes: ["INVALID_JSON"], success: false },
      { status: 400 },
    );
  }

  const parsed = verifyTokenSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { errorCodes: ["INVALID_INPUT"], success: false },
      { status: 400 },
    );
  }

  const apiUrl = process.env.TRUSTCAPTCHA_API_URL;
  const secret = process.env.TRUSTCAPTCHA_DEMO_SECRET;
  if (!apiUrl || !secret) {
    return Response.json(
      { errorCodes: ["DEMO_SERVER_NOT_CONFIGURED"], success: false },
      { status: 503 },
    );
  }

  const upstream = await fetch(`${apiUrl.replace(/\/$/, "")}/api/v1/verify`, {
    body: JSON.stringify({
      action: parsed.data.action,
      token: parsed.data.token,
    }),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
