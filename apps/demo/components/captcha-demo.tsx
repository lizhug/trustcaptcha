"use client";

import type { TrustCaptchaWidgetHandle } from "@trustcaptcha/sdk/types";
import type { SupportedLocale } from "@trustcaptcha/shared";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type VerifyResult = {
  action?: string;
  errorCodes?: string[];
  expire?: number;
  score?: number;
  success: boolean;
};

export function CaptchaDemo({
  apiBaseUrl,
  language,
  siteKey,
}: {
  apiBaseUrl: string;
  language: Exclude<SupportedLocale, "auto">;
  siteKey: string;
}) {
  const widget = useRef<TrustCaptchaWidgetHandle | undefined>(undefined);
  const [sdkReady, setSdkReady] = useState(false);
  const [token, setToken] = useState<string>();
  const [verifyResult, setVerifyResult] = useState<VerifyResult>();
  const [error, setError] = useState<string>();

  const mountWidget = useCallback(() => {
    if (!siteKey || !window.TrustCaptcha || widget.current) return;
    widget.current = window.TrustCaptcha.render({
      action: "demo_submit",
      apiBaseUrl,
      callback: async (nextToken) => {
        setToken(nextToken);
        setError(undefined);
        const response = await fetch("/api/verify", {
          body: JSON.stringify({ action: "demo_submit", token: nextToken }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = (await response.json()) as VerifyResult;
        setVerifyResult(result);
      },
      element: "#trustcaptcha-widget",
      errorCallback: (widgetError) => setError(widgetError.code),
      language,
      mode: "checkbox",
      siteKey,
    });
  }, [apiBaseUrl, language, siteKey]);

  useEffect(() => {
    if (sdkReady) mountWidget();
  }, [mountWidget, sdkReady]);

  useEffect(
    () => () => {
      widget.current?.destroy();
      widget.current = undefined;
    },
    [],
  );

  async function reset() {
    setToken(undefined);
    setVerifyResult(undefined);
    setError(undefined);
    await widget.current?.reset();
  }

  return (
    <>
      <Script
        async
        data-api-base={apiBaseUrl}
        defer
        src={`${apiBaseUrl}/trustcaptcha.js`}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />

      <section
        className="demo-card"
        aria-label="Live TrustCaptcha verification"
      >
        <div className="demo-card-heading">
          <div>
            <p className="demo-step">Live product demo</p>
            <h2>Verify a protected action</h2>
          </div>
          <span className={verifyResult?.success ? "status success" : "status"}>
            {verifyResult?.success ? "Verified" : "Ready"}
          </span>
        </div>

        <div className="mode-rail" aria-label="Available verification modes">
          <span>Managed</span>
          <span className="active">Checkbox</span>
          <span>Invisible</span>
        </div>

        {!siteKey ? (
          <div className="setup-notice">
            Set <code>DEMO_SITE_KEY</code> to a Site Key whose allowed origin
            includes this demo URL.
          </div>
        ) : (
          <div id="trustcaptcha-widget" className="widget-slot" />
        )}

        {error ? <p className="error-text">Widget error: {error}</p> : null}

        <dl className="result-grid" data-nosnippet>
          <div>
            <dt>Protected action</dt>
            <dd>{verifyResult?.action ?? "demo_submit"}</dd>
          </div>
          <div>
            <dt>Browser token</dt>
            <dd>{token ? `${token.slice(0, 28)}…` : "Not issued"}</dd>
          </div>
          <div>
            <dt>Server verification</dt>
            <dd>{verifyResult?.success ? "Accepted once" : "Pending"}</dd>
          </div>
          <div>
            <dt>Risk score</dt>
            <dd>{verifyResult?.score ?? "—"}</dd>
          </div>
          <div>
            <dt>Remaining TTL</dt>
            <dd>
              {verifyResult?.expire === undefined
                ? "—"
                : `${verifyResult.expire}s`}
            </dd>
          </div>
        </dl>

        <div className="demo-actions">
          <button type="button" className="secondary-action" onClick={reset}>
            Reset verification
          </button>
          <button type="button" disabled={!verifyResult?.success}>
            Protected action ready
          </button>
        </div>
      </section>
    </>
  );
}
