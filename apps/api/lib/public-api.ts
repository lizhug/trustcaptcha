import { randomUUID } from "node:crypto";

export function allowedRequestOrigin(
  request: Request,
  allowedOrigins: readonly string[],
): string | null {
  const origin = request.headers.get("origin");
  return origin && allowedOrigins.includes(origin) ? origin : null;
}

export function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Expose-Headers": "Retry-After, X-Request-Id",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

export function preflightResponse(request: Request): Response {
  const origin = request.headers.get("origin");
  if (!origin || !/^https?:\/\//.test(origin))
    return new Response(null, { status: 403 });

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    },
  });
}

export function publicError(
  status: number,
  code: string,
  origin?: string,
  extraHeaders?: HeadersInit,
): Response {
  const requestId = randomUUID();
  return Response.json(
    { errorCodes: [code], requestId, success: false },
    {
      status,
      headers: {
        ...(origin ? corsHeaders(origin) : { "Cache-Control": "no-store" }),
        ...extraHeaders,
        "X-Request-Id": requestId,
      },
    },
  );
}

export function publicSuccess(
  data: Record<string, unknown>,
  origin: string,
  status = 200,
): Response {
  const requestId = randomUUID();
  return Response.json(
    { ...data, requestId },
    { status, headers: { ...corsHeaders(origin), "X-Request-Id": requestId } },
  );
}
