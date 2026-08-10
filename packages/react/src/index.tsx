"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from "react";

export type TrustCaptchaLanguage =
  | "auto"
  | "en"
  | "zh-CN"
  | "zh-TW"
  | "ja"
  | "ko"
  | "es"
  | "pt-BR"
  | "de"
  | "fr";

export type TrustCaptchaMode =
  | "managed"
  | "checkbox"
  | "invisible"
  | "non-interactive";

export type TrustCaptchaRef = {
  execute(): Promise<void>;
  getResponse(): string | null;
  remove(): void;
  reset(): Promise<void>;
};

export type TrustCaptchaProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onError"
> & {
  action?: string;
  apiBaseUrl?: string;
  language?: TrustCaptchaLanguage;
  mode?: TrustCaptchaMode;
  onError?: (code: string) => void;
  onExpire?: () => void;
  onVerify: (token: string) => void;
  responseFieldName?: string;
  scriptUrl?: string;
  siteKey: string;
};

type WidgetHandle = {
  destroy(): void;
  execute(): Promise<void>;
  getResponse(): string | null;
  reset(): Promise<void>;
};

type BrowserApi = {
  render(options: {
    action?: string;
    apiBaseUrl?: string;
    callback?: (token: string) => void;
    element: HTMLElement;
    errorCallback?: (error: { code: string }) => void;
    expiredCallback?: () => void;
    language?: TrustCaptchaLanguage;
    mode?: TrustCaptchaMode;
    responseFieldName?: string;
    siteKey: string;
  }): WidgetHandle;
};

const scriptLoads = new Map<string, Promise<void>>();

export const TrustCaptcha = forwardRef<TrustCaptchaRef, TrustCaptchaProps>(
  function TrustCaptcha(
    {
      action = "generic",
      apiBaseUrl = "https://api.trustcaptcha.xuandev.com",
      language = "auto",
      mode = "managed",
      onError,
      onExpire,
      onVerify,
      responseFieldName,
      scriptUrl,
      siteKey,
      ...containerProps
    },
    ref,
  ) {
    const container = useRef<HTMLDivElement | null>(null);
    const widget = useRef<WidgetHandle | null>(null);
    const callbacks = useRef({ onError, onExpire, onVerify });
    callbacks.current = { onError, onExpire, onVerify };

    useImperativeHandle(
      ref,
      () => ({
        execute: () => widget.current?.execute() ?? Promise.resolve(),
        getResponse: () => widget.current?.getResponse() ?? null,
        remove: () => widget.current?.destroy(),
        reset: () => widget.current?.reset() ?? Promise.resolve(),
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      const url =
        scriptUrl ??
        `${apiBaseUrl.replace(/\/+$/, "")}/v1/api.js?render=explicit`;

      void loadBrowserSdk(url)
        .then(() => {
          if (cancelled || !container.current) return;
          const api = getBrowserApi();
          widget.current = api.render({
            action,
            apiBaseUrl,
            callback: (token) => callbacks.current.onVerify(token),
            element: container.current,
            errorCallback: (error) => callbacks.current.onError?.(error.code),
            expiredCallback: () => callbacks.current.onExpire?.(),
            language,
            mode,
            responseFieldName,
            siteKey,
          });
        })
        .catch(() => callbacks.current.onError?.("SDK_LOAD_FAILED"));

      return () => {
        cancelled = true;
        widget.current?.destroy();
        widget.current = null;
      };
    }, [
      action,
      apiBaseUrl,
      language,
      mode,
      responseFieldName,
      scriptUrl,
      siteKey,
    ]);

    return <div {...containerProps} ref={container} />;
  },
);

function getBrowserApi() {
  const api = (window as typeof window & { TrustCaptcha?: BrowserApi })
    .TrustCaptcha;
  if (!api) throw new Error("SDK_NOT_AVAILABLE");
  return api;
}

function loadBrowserSdk(url: string) {
  const existing = scriptLoads.get(url);
  if (existing) return existing;
  const load = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("BROWSER_REQUIRED"));
      return;
    }
    if (
      (window as typeof window & { TrustCaptcha?: BrowserApi }).TrustCaptcha
    ) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = url;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("SDK_LOAD_FAILED")),
      {
        once: true,
      },
    );
    document.head.append(script);
  });
  scriptLoads.set(url, load);
  load.catch(() => scriptLoads.delete(url));
  return load;
}
