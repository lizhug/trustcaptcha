import type {
  InteractionSignals,
  SupportedLocale,
  VerificationMode,
} from "@trustcaptcha/shared";

export type TrustCaptchaRenderOptions = {
  action?: string;
  apiBaseUrl?: string;
  callback?: (token: string) => void;
  element: HTMLElement | string;
  errorCallback?: (error: TrustCaptchaWidgetError) => void;
  expiredCallback?: () => void;
  language?: SupportedLocale;
  mode?: VerificationMode;
  responseFieldName?: string;
  siteKey: string;
};

export type TrustCaptchaWidgetHandle = {
  destroy(): void;
  execute(): Promise<void>;
  getResponse(): string | null;
  reset(): Promise<void>;
};

export class TrustCaptchaWidgetError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "TrustCaptchaWidgetError";
  }
}

type ChallengeResponse = {
  challengeId: string;
  expireAt: number;
  language?: SupportedLocale;
  mode: "checkbox" | "invisible" | "non-interactive";
  proofOfWork?: {
    algorithm: "SHA-256";
    difficulty: number;
    salt: string;
  };
  success: boolean;
  visual?: {
    altText: string;
    assetUrl: string;
    rotationQuarterTurns: number;
  };
};

type CompleteResponse = {
  challengePassed: boolean;
  success: boolean;
  token?: string;
};

type WidgetConfigResponse = {
  defaultLocale?: SupportedLocale;
  supportedLocales?: SupportedLocale[];
};

type WidgetState =
  | "destroyed"
  | "error"
  | "loading"
  | "ready"
  | "verified"
  | "verifying";

const widgets = new WeakMap<HTMLElement, TrustCaptchaWidgetHandle>();
const defaultApiBaseUrl = discoverApiBaseUrl();

export function render(
  options: TrustCaptchaRenderOptions,
): TrustCaptchaWidgetHandle {
  const element = resolveElement(options.element);
  const existing = widgets.get(element);
  if (existing) return existing;

  if (!/^tc_pk_[A-Za-z0-9_-]+$/.test(options.siteKey)) {
    throw new TrustCaptchaWidgetError("INVALID_SITE_KEY");
  }
  const action = options.action ?? "generic";
  const requestedMode = options.mode ?? "managed";
  let language = resolveLanguage(options.language ?? "auto");
  let messages = translations[language];
  if (!/^[A-Za-z0-9/_-]{1,32}$/.test(action)) {
    throw new TrustCaptchaWidgetError("INVALID_ACTION");
  }

  const apiBaseUrl = stripTrailingSlash(
    options.apiBaseUrl ?? defaultApiBaseUrl,
  );
  if (!apiBaseUrl) throw new TrustCaptchaWidgetError("API_BASE_URL_MISSING");

  const host = document.createElement("div");
  host.className = "trustcaptcha-host";
  host.dataset.presentation = requestedMode;
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = widgetMarkup;
  element.replaceChildren(host);
  const responseInput = createResponseInput(
    element,
    options.responseFieldName ?? "trustcaptcha-response",
  );

  const button = requiredElement<HTMLButtonElement>(
    shadow,
    '[data-role="verify"]',
  );
  const status = requiredElement<HTMLElement>(shadow, '[data-role="status"]');
  const label = requiredElement<HTMLElement>(shadow, '[data-role="label"]');
  const visualPanel = requiredElement<HTMLElement>(
    shadow,
    '[data-role="visual"]',
  );
  const visualImage = requiredElement<HTMLImageElement>(
    shadow,
    '[data-role="visual-image"]',
  );
  const visualPrompt = requiredElement<HTMLElement>(
    shadow,
    '[data-role="visual-prompt"]',
  );
  const rotateButton = requiredElement<HTMLButtonElement>(
    shadow,
    '[data-role="rotate"]',
  );
  applyMessages();
  const interactionCollector = createInteractionCollector(button);
  let state: WidgetState = "loading";
  let challenge: ChallengeResponse | null = null;
  let responseToken: string | null = null;
  let requestNonce = createNonce();
  let controller = new AbortController();
  let callbackFired = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let visualRotationQuarterTurns = 0;

  function setState(next: WidgetState, message: string) {
    state = next;
    host.dataset.state = next;
    button.disabled =
      next === "loading" || next === "verifying" || next === "verified";
    rotateButton.disabled = button.disabled;
    button.setAttribute("aria-checked", next === "verified" ? "true" : "false");
    status.textContent = message;
  }

  async function prepare() {
    setState("loading", messages.loading);
    challenge = null;
    responseToken = null;
    responseInput.value = "";
    clearTimeout(expiryTimer);
    requestNonce = createNonce();
    visualRotationQuarterTurns = 0;
    visualPanel.hidden = true;
    host.dataset.hasVisual = "false";
    interactionCollector.reset();
    controller.abort();
    controller = new AbortController();

    try {
      const config = await fetchJson<WidgetConfigResponse>(
        `${apiBaseUrl}/api/v1/widget/config?siteKey=${encodeURIComponent(options.siteKey)}`,
        { signal: controller.signal },
      );
      language = chooseConfiguredLanguage(language, config);
      messages = translations[language];
      applyMessages();
      const challengeResponse = await fetchJson<ChallengeResponse>(
        `${apiBaseUrl}/api/v1/challenges`,
        {
          body: JSON.stringify({
            action,
            language,
            mode: requestedMode,
            pageUrl: window.location.href,
            requestNonce,
            siteKey: options.siteKey,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        },
      );
      challenge = {
        ...challengeResponse,
        mode: challengeResponse.mode ?? "checkbox",
      };
      if (state !== "destroyed") {
        host.dataset.challengeMode = challenge.mode;
        if (challenge.visual) {
          host.dataset.hasVisual = "true";
          visualPanel.hidden = false;
          visualImage.src = challenge.visual.assetUrl;
          visualImage.alt = challenge.visual.altText || messages.visualAlt;
          updateVisualRotation();
        }
        setState(
          "ready",
          challenge.visual
            ? messages.visualReady
            : challenge.mode === "invisible" ||
                challenge.mode === "non-interactive"
              ? messages.running
              : messages.ready,
        );
        if (
          challenge.mode === "invisible" ||
          challenge.mode === "non-interactive"
        ) {
          queueMicrotask(() => void verifyChallenge());
        }
      }
    } catch (error) {
      if (!isDestroyed() && !isAbortError(error)) reportError(error);
    }
  }

  async function verifyChallenge() {
    if (state === "error") {
      await prepare();
      return;
    }
    if (state !== "ready" || !challenge) return;
    if (challenge.expireAt <= Date.now()) {
      await prepare();
      return;
    }

    setState("verifying", messages.verifying);
    try {
      const proofOfWork = challenge.proofOfWork
        ? {
            nonce: await solveProofOfWork(
              challenge.challengeId,
              challenge.proofOfWork,
              controller.signal,
            ),
          }
        : undefined;
      const result = await fetchJson<CompleteResponse>(
        `${apiBaseUrl}/api/v1/challenges/${encodeURIComponent(challenge.challengeId)}/complete`,
        {
          body: JSON.stringify({
            cookieEnabled: navigator.cookieEnabled,
            ...(challenge.mode === "checkbox"
              ? { interaction: interactionCollector.snapshot() }
              : {}),
            ...(proofOfWork ? { proofOfWork } : {}),
            requestNonce,
            storageAvailable: canUseStorage(),
            ...(challenge.visual
              ? {
                  visualAnswer: {
                    rotationQuarterTurns: visualRotationQuarterTurns,
                  },
                }
              : {}),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        },
      );
      if (!result.success || !result.challengePassed || !result.token) {
        throw new TrustCaptchaWidgetError("VERIFICATION_REJECTED");
      }

      responseToken = result.token;
      responseInput.value = result.token;
      responseInput.dispatchEvent(new Event("input", { bubbles: true }));
      responseInput.dispatchEvent(new Event("change", { bubbles: true }));
      setState("verified", messages.complete);
      if (!callbackFired) {
        callbackFired = true;
        queueMicrotask(() => options.callback?.(result.token!));
      }
      const expiresIn = Math.max(
        0,
        (challenge?.expireAt ?? Date.now()) - Date.now(),
      );
      expiryTimer = setTimeout(() => {
        if (state !== "verified") return;
        responseToken = null;
        responseInput.value = "";
        options.expiredCallback?.();
        callbackFired = false;
        void prepare();
      }, expiresIn);
    } catch (error) {
      if (!isDestroyed() && !isAbortError(error)) reportError(error);
    }
  }

  function reportError(error: unknown) {
    const widgetError =
      error instanceof TrustCaptchaWidgetError
        ? error
        : new TrustCaptchaWidgetError("NETWORK_ERROR");
    setState("error", messages.retry);
    options.errorCallback?.(widgetError);
  }

  function isDestroyed() {
    return state === "destroyed";
  }

  const handle: TrustCaptchaWidgetHandle = {
    destroy() {
      if (state === "destroyed") return;
      state = "destroyed";
      controller.abort();
      clearTimeout(expiryTimer);
      interactionCollector.destroy();
      button.removeEventListener("click", verifyChallenge);
      rotateButton.removeEventListener("click", rotateVisual);
      host.remove();
      responseInput.remove();
      widgets.delete(element);
      delete element.dataset.trustcaptchaRendered;
    },
    async execute() {
      await verifyChallenge();
    },
    getResponse() {
      return responseToken;
    },
    async reset() {
      if (state === "destroyed") return;
      callbackFired = false;
      await prepare();
    },
  };

  button.addEventListener("click", verifyChallenge);
  rotateButton.addEventListener("click", rotateVisual);
  widgets.set(element, handle);
  element.dataset.trustcaptchaRendered = "true";
  void prepare();
  return handle;

  function rotateVisual() {
    if (!challenge?.visual || state !== "ready") return;
    visualRotationQuarterTurns = (visualRotationQuarterTurns + 1) % 4;
    updateVisualRotation();
  }

  function updateVisualRotation() {
    const initial = challenge?.visual?.rotationQuarterTurns ?? 0;
    visualImage.style.transform = `rotate(${(initial + visualRotationQuarterTurns) * 90}deg)`;
  }

  function applyMessages() {
    label.textContent = messages.label;
    button.setAttribute("aria-label", messages.ariaLabel);
    rotateButton.textContent = messages.rotate;
    visualPrompt.textContent = messages.visualPrompt;
  }
}

export function renderAll(
  root: ParentNode = document,
): TrustCaptchaWidgetHandle[] {
  const elements = root.querySelectorAll<HTMLElement>(
    ".trust-captcha[data-sitekey], .trustcaptcha[data-sitekey]",
  );
  return Array.from(elements, (element) => {
    const existing = widgets.get(element);
    if (existing) return existing;
    return render({
      action: element.dataset.action || "generic",
      apiBaseUrl: element.dataset.apiBase || defaultApiBaseUrl,
      callback: resolveNamedCallback<(token: string) => void>(
        element.dataset.callback,
      ),
      element,
      errorCallback: resolveNamedCallback<
        (error: TrustCaptchaWidgetError) => void
      >(element.dataset.errorCallback),
      expiredCallback: resolveNamedCallback<() => void>(
        element.dataset.expiredCallback,
      ),
      language: (element.dataset.language || "auto") as SupportedLocale,
      mode: (element.dataset.mode || "managed") as VerificationMode,
      responseFieldName:
        element.dataset.responseField || "trustcaptcha-response",
      siteKey: element.dataset.sitekey!,
    });
  });
}

export function execute(element?: HTMLElement | string): Promise<void> {
  return requireWidget(element).execute();
}

export function getResponse(element?: HTMLElement | string): string | null {
  return requireWidget(element).getResponse();
}

export function reset(element?: HTMLElement | string): Promise<void> {
  return requireWidget(element).reset();
}

export function remove(element?: HTMLElement | string): void {
  requireWidget(element).destroy();
}

function requireWidget(element?: HTMLElement | string) {
  const resolved = element
    ? resolveElement(element)
    : document.querySelectorAll<HTMLElement>("[data-trustcaptcha-rendered]")
          .length === 1
      ? (document.querySelector<HTMLElement>("[data-trustcaptcha-rendered]") ??
        undefined)
      : undefined;
  const handle = resolved ? widgets.get(resolved) : undefined;
  if (!handle) throw new TrustCaptchaWidgetError("WIDGET_NOT_FOUND");
  return handle;
}

function createResponseInput(element: HTMLElement, name: string) {
  if (!/^[A-Za-z0-9_.:[\]-]{1,64}$/.test(name)) {
    throw new TrustCaptchaWidgetError("INVALID_RESPONSE_FIELD");
  }
  const input = document.createElement("input");
  input.dataset.trustcaptchaResponse = "true";
  input.name = name;
  input.type = "hidden";
  element.append(input);
  return input;
}

function resolveNamedCallback<T extends (...args: never[]) => unknown>(
  name?: string,
): T | undefined {
  if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) return undefined;
  const candidate = (window as unknown as Record<string, unknown>)[name];
  return typeof candidate === "function" ? (candidate as T) : undefined;
}

if (typeof document !== "undefined" && shouldAutoRender()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => renderAll(), {
      once: true,
    });
  } else {
    queueMicrotask(() => renderAll());
  }
}

function shouldAutoRender() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script?.src) return true;
  return (
    new URL(script.src, document.baseURI).searchParams.get("render") !==
    "explicit"
  );
}

function resolveElement(value: HTMLElement | string): HTMLElement {
  const element =
    typeof value === "string" ? document.querySelector(value) : value;
  if (!(element instanceof HTMLElement)) {
    throw new TrustCaptchaWidgetError("ELEMENT_NOT_FOUND");
  }
  return element;
}

async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, mode: "cors" });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new TrustCaptchaWidgetError("NETWORK_ERROR");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TrustCaptchaWidgetError("INVALID_RESPONSE");
  }

  if (!response.ok) {
    const errorCodes = (payload as { errorCodes?: unknown })?.errorCodes;
    throw new TrustCaptchaWidgetError(
      Array.isArray(errorCodes) && typeof errorCodes[0] === "string"
        ? errorCodes[0]
        : "REQUEST_FAILED",
    );
  }
  return payload as T;
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function canUseStorage(): boolean {
  try {
    const key = `tc_${createNonce()}`;
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

type InteractionCollector = {
  destroy(): void;
  reset(): void;
  snapshot(): InteractionSignals;
};

type Point = { at: number; x: number; y: number };

const MAX_POINTER_SAMPLES = 256;
const MAX_POINTER_DISTANCE = 100_000;

function createInteractionCollector(
  button: HTMLButtonElement,
): InteractionCollector {
  let clickDurationMs = 0;
  let clickTrusted = false;
  let directionChanges = 0;
  let firstPoint: Point | null = null;
  let focusChanges = 0;
  let inputMethod: InteractionSignals["inputMethod"] = "unknown";
  let lastAngle: number | null = null;
  let lastPoint: Point | null = null;
  let moveEvents = 0;
  let pointerDistancePx = 0;
  let pointerDownAt: number | null = null;
  let visibilityChanges = 0;

  const onPointerMove = (event: PointerEvent) => {
    if (moveEvents >= MAX_POINTER_SAMPLES) return;
    const point = {
      at: performance.now(),
      x: event.clientX,
      y: event.clientY,
    };
    const method = normalizePointerType(event.pointerType);
    if (inputMethod === "unknown" && method !== "unknown") {
      inputMethod = method;
    }

    if (!firstPoint) firstPoint = point;
    if (lastPoint) {
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        pointerDistancePx = Math.min(
          MAX_POINTER_DISTANCE,
          pointerDistancePx + distance,
        );
        const angle = Math.atan2(dy, dx);
        if (
          lastAngle !== null &&
          angularDifference(lastAngle, angle) >= Math.PI / 8
        ) {
          directionChanges = Math.min(128, directionChanges + 1);
        }
        lastAngle = angle;
      }
    }
    lastPoint = point;
    moveEvents += 1;
  };

  const onPointerDown = (event: PointerEvent) => {
    inputMethod = normalizePointerType(event.pointerType);
    pointerDownAt = performance.now();
  };

  const onPointerUp = () => {
    if (pointerDownAt !== null) {
      clickDurationMs = Math.max(0, performance.now() - pointerDownAt);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") inputMethod = "keyboard";
  };

  const onClick = (event: MouseEvent) => {
    clickTrusted = event.isTrusted;
    if (inputMethod === "unknown") {
      inputMethod = event.detail === 0 ? "keyboard" : "mouse";
    }
  };

  const onFocusChange = () => {
    focusChanges = Math.min(50, focusChanges + 1);
  };

  const onVisibilityChange = () => {
    visibilityChanges = Math.min(50, visibilityChanges + 1);
  };

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onFocusChange);
  window.addEventListener("focus", onFocusChange);
  button.addEventListener("click", onClick);
  button.addEventListener("keydown", onKeyDown);
  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("pointerup", onPointerUp);

  function reset() {
    clickDurationMs = 0;
    clickTrusted = false;
    directionChanges = 0;
    firstPoint = null;
    focusChanges = 0;
    inputMethod = "unknown";
    lastAngle = null;
    lastPoint = null;
    moveEvents = 0;
    pointerDistancePx = 0;
    pointerDownAt = null;
    visibilityChanges = 0;
  }

  return {
    destroy() {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onFocusChange);
      window.removeEventListener("focus", onFocusChange);
      button.removeEventListener("click", onClick);
      button.removeEventListener("keydown", onKeyDown);
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointerup", onPointerUp);
    },
    reset,
    snapshot() {
      const directDistance =
        firstPoint && lastPoint
          ? Math.hypot(lastPoint.x - firstPoint.x, lastPoint.y - firstPoint.y)
          : 0;
      const pointerDurationMs =
        firstPoint && lastPoint && moveEvents > 1
          ? lastPoint.at - firstPoint.at
          : 0;
      return {
        clickDurationMs: quantize(clickDurationMs, 5, 10_000),
        directionChanges: Math.min(
          directionChanges,
          Math.max(0, moveEvents - 2),
        ),
        focusChanges,
        inputMethod,
        moveEvents,
        pathEfficiency:
          moveEvents > 1 && pointerDistancePx > 0
            ? Math.min(
                100,
                Math.round((directDistance / pointerDistancePx) * 100),
              )
            : 0,
        pointerDistancePx: quantize(pointerDistancePx, 4, MAX_POINTER_DISTANCE),
        pointerDurationMs: quantize(pointerDurationMs, 10, 300_000),
        trustedEvent: clickTrusted,
        visibilityChanges,
      };
    },
  };
}

function normalizePointerType(
  value: string,
): InteractionSignals["inputMethod"] {
  return value === "mouse" || value === "pen" || value === "touch"
    ? value
    : "unknown";
}

function angularDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % (Math.PI * 2);
  return Math.min(difference, Math.PI * 2 - difference);
}

function quantize(value: number, step: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, Math.round(value / step) * step));
}

async function solveProofOfWork(
  challengeId: string,
  challenge: { difficulty: number; salt: string },
  signal: AbortSignal,
): Promise<string> {
  if (
    !crypto.subtle ||
    !Number.isInteger(challenge.difficulty) ||
    challenge.difficulty < 1 ||
    challenge.difficulty > 20
  ) {
    throw new TrustCaptchaWidgetError("POW_UNAVAILABLE");
  }

  const encoder = new TextEncoder();
  const batchSize = 64;
  const maximumAttempts = 1 << Math.min(22, challenge.difficulty + 4);
  for (let start = 0; start < maximumAttempts; start += batchSize) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const candidates = Array.from(
      { length: Math.min(batchSize, maximumAttempts - start) },
      (_, index) => (start + index).toString(36),
    );
    const digests = await Promise.all(
      candidates.map((nonce) =>
        crypto.subtle.digest(
          "SHA-256",
          encoder.encode(`${challengeId}.${challenge.salt}.${nonce}`),
        ),
      ),
    );
    const match = digests.findIndex((digest) =>
      hasLeadingZeroBits(new Uint8Array(digest), challenge.difficulty),
    );
    if (match >= 0) return candidates[match]!;
    if (start > 0 && start % (batchSize * 16) === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  throw new TrustCaptchaWidgetError("POW_UNSOLVABLE");
}

function hasLeadingZeroBits(digest: Uint8Array, difficulty: number): boolean {
  let remaining = difficulty;
  for (const byte of digest) {
    if (remaining === 0) return true;
    const bits = Math.min(8, remaining);
    if (byte >> (8 - bits) !== 0) return false;
    remaining -= bits;
  }
  return remaining === 0;
}

function discoverApiBaseUrl(): string {
  if (typeof document === "undefined") return "";
  const script = document.currentScript as HTMLScriptElement | null;
  if (script?.dataset.apiBase)
    return stripTrailingSlash(script.dataset.apiBase);
  if (script?.src) return new URL(script.src, document.baseURI).origin;
  return typeof window === "undefined" ? "" : window.location.origin;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function requiredElement<T extends Element>(
  root: ShadowRoot,
  selector: string,
): T {
  const element = root.querySelector(selector);
  if (!element) throw new TrustCaptchaWidgetError("WIDGET_RENDER_FAILED");
  return element as T;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

type ResolvedLocale = Exclude<SupportedLocale, "auto">;
type WidgetMessages = {
  ariaLabel: string;
  complete: string;
  label: string;
  loading: string;
  ready: string;
  retry: string;
  rotate: string;
  running: string;
  verifying: string;
  visualAlt: string;
  visualPrompt: string;
  visualReady: string;
};

const translations: Record<ResolvedLocale, WidgetMessages> = {
  en: {
    ariaLabel: "Verify that you are not a robot",
    complete: "Verification complete",
    label: "I'm not a robot",
    loading: "Loading protection…",
    ready: "Protection ready",
    retry: "Unable to verify — click to retry",
    rotate: "Rotate 90°",
    running: "Running a private security check…",
    verifying: "Verifying…",
    visualAlt: "Brand image orientation challenge",
    visualPrompt: "Rotate the image upright, then verify.",
    visualReady: "Orient the image, then verify",
  },
  "zh-CN": {
    ariaLabel: "验证您不是机器人",
    complete: "验证完成",
    label: "我不是机器人",
    loading: "正在加载安全防护…",
    ready: "防护已就绪",
    retry: "验证失败，请点击重试",
    rotate: "旋转 90°",
    running: "正在进行隐私安全检查…",
    verifying: "正在验证…",
    visualAlt: "品牌图片方向验证",
    visualPrompt: "请将图片旋转至正向，然后验证。",
    visualReady: "调整图片方向后验证",
  },
  "zh-TW": {
    ariaLabel: "驗證您不是機器人",
    complete: "驗證完成",
    label: "我不是機器人",
    loading: "正在載入安全防護…",
    ready: "防護已就緒",
    retry: "驗證失敗，請點擊重試",
    rotate: "旋轉 90°",
    running: "正在進行隱私安全檢查…",
    verifying: "正在驗證…",
    visualAlt: "品牌圖片方向驗證",
    visualPrompt: "請將圖片旋轉至正向，然後驗證。",
    visualReady: "調整圖片方向後驗證",
  },
  ja: {
    ariaLabel: "ロボットではないことを確認",
    complete: "確認が完了しました",
    label: "私はロボットではありません",
    loading: "保護機能を読み込み中…",
    ready: "準備完了",
    retry: "確認できませんでした。クリックして再試行",
    rotate: "90° 回転",
    running: "プライベートなセキュリティ確認中…",
    verifying: "確認中…",
    visualAlt: "ブランド画像の向き確認",
    visualPrompt: "画像を正しい向きに回転して確認してください。",
    visualReady: "画像の向きを合わせて確認",
  },
  ko: {
    ariaLabel: "로봇이 아님을 확인",
    complete: "확인 완료",
    label: "로봇이 아닙니다",
    loading: "보호 기능 불러오는 중…",
    ready: "보호 준비 완료",
    retry: "확인할 수 없습니다. 클릭하여 다시 시도",
    rotate: "90° 회전",
    running: "개인정보 보호 보안 확인 중…",
    verifying: "확인 중…",
    visualAlt: "브랜드 이미지 방향 확인",
    visualPrompt: "이미지를 바르게 회전한 다음 확인하세요.",
    visualReady: "이미지 방향을 맞춘 후 확인",
  },
  es: {
    ariaLabel: "Verifica que no eres un robot",
    complete: "Verificación completada",
    label: "No soy un robot",
    loading: "Cargando protección…",
    ready: "Protección lista",
    retry: "No se pudo verificar — haz clic para reintentar",
    rotate: "Girar 90°",
    running: "Ejecutando una comprobación privada…",
    verifying: "Verificando…",
    visualAlt: "Desafío de orientación de imagen de marca",
    visualPrompt: "Gira la imagen a su posición correcta y verifica.",
    visualReady: "Orienta la imagen y verifica",
  },
  "pt-BR": {
    ariaLabel: "Verifique que você não é um robô",
    complete: "Verificação concluída",
    label: "Não sou um robô",
    loading: "Carregando proteção…",
    ready: "Proteção pronta",
    retry: "Não foi possível verificar — clique para tentar novamente",
    rotate: "Girar 90°",
    running: "Executando uma verificação privada…",
    verifying: "Verificando…",
    visualAlt: "Desafio de orientação de imagem da marca",
    visualPrompt: "Gire a imagem para a posição correta e verifique.",
    visualReady: "Oriente a imagem e verifique",
  },
  de: {
    ariaLabel: "Bestätigen Sie, dass Sie kein Roboter sind",
    complete: "Überprüfung abgeschlossen",
    label: "Ich bin kein Roboter",
    loading: "Schutz wird geladen…",
    ready: "Schutz ist bereit",
    retry: "Überprüfung fehlgeschlagen — zum Wiederholen klicken",
    rotate: "Um 90° drehen",
    running: "Private Sicherheitsprüfung läuft…",
    verifying: "Wird überprüft…",
    visualAlt: "Ausrichtungsaufgabe mit Markenbild",
    visualPrompt: "Drehen Sie das Bild richtig herum und bestätigen Sie.",
    visualReady: "Bild ausrichten und bestätigen",
  },
  fr: {
    ariaLabel: "Vérifiez que vous n'êtes pas un robot",
    complete: "Vérification terminée",
    label: "Je ne suis pas un robot",
    loading: "Chargement de la protection…",
    ready: "Protection prête",
    retry: "Échec de la vérification — cliquez pour réessayer",
    rotate: "Tourner de 90°",
    running: "Vérification de sécurité privée en cours…",
    verifying: "Vérification…",
    visualAlt: "Défi d'orientation d'une image de marque",
    visualPrompt: "Remettez l'image à l'endroit, puis validez.",
    visualReady: "Orientez l'image, puis validez",
  },
};

function resolveLanguage(requested: SupportedLocale): ResolvedLocale {
  if (requested !== "auto") return requested;
  const browserLanguages =
    typeof navigator === "undefined"
      ? ["en"]
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  for (const raw of browserLanguages) {
    const locale = raw.toLowerCase();
    if (
      locale.startsWith("zh-tw") ||
      locale.startsWith("zh-hk") ||
      locale.startsWith("zh-hant")
    )
      return "zh-TW";
    if (locale.startsWith("zh")) return "zh-CN";
    if (locale.startsWith("pt")) return "pt-BR";
    if (locale.startsWith("ja")) return "ja";
    if (locale.startsWith("ko")) return "ko";
    if (locale.startsWith("es")) return "es";
    if (locale.startsWith("de")) return "de";
    if (locale.startsWith("fr")) return "fr";
  }
  return "en";
}

function chooseConfiguredLanguage(
  requested: ResolvedLocale,
  config: WidgetConfigResponse,
): ResolvedLocale {
  if (
    !config.supportedLocales ||
    config.supportedLocales.includes("auto") ||
    config.supportedLocales.includes(requested)
  ) {
    return requested;
  }
  return resolveLanguage(config.defaultLocale ?? "en");
}

const widgetMarkup = `
  <style>
    :host { all: initial; }
    .tc-shell {
      display: grid;
      width: 304px;
      gap: 8px;
      font: 14px/1.35 Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .tc-widget {
      box-sizing: border-box;
      display: flex;
      width: 100%;
      min-height: 74px;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border: 1px solid #c9d3e1;
      border-radius: 8px;
      color: #17233c;
      background: #f8fafc;
      box-shadow: 0 3px 10px rgba(17, 32, 61, .08);
      grid-row: 2;
    }
    .verify-button {
      all: unset;
      box-sizing: border-box;
      display: flex;
      min-width: 185px;
      cursor: pointer;
      align-items: center;
      gap: 12px;
      color: #17233c;
    }
    .verify-button:focus-visible, .rotate-button:focus-visible { outline: 3px solid rgba(23, 105, 255, .28); outline-offset: 3px; }
    button:disabled { cursor: default; opacity: .72; }
    .verify-button:disabled, .rotate-button:disabled { cursor: default; opacity: .72; }
    :host([data-state="loading"]) .verify-button:disabled,
    :host([data-state="verifying"]) .verify-button:disabled { cursor: wait; }
    :host([data-state="verifying"]) button:disabled { cursor: wait; }
    :host([data-state="verified"]) button:disabled { cursor: default; }
    :host([data-challenge-mode="invisible"]) .tc-shell {
      display: none;
    }
    .visual-panel {
      box-sizing: border-box;
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid #c9d3e1;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 3px 10px rgba(17, 32, 61, .08);
      grid-row: 1;
    }
    .visual-panel[hidden] { display: none; }
    .visual-prompt { margin: 0; color: #34435c; font-size: 12px; font-weight: 600; }
    .visual-frame {
      display: grid;
      height: 152px;
      overflow: hidden;
      place-items: center;
      border-radius: 8px;
      background: linear-gradient(135deg, #eef4ff, #f7f9fc);
    }
    .visual-image {
      display: block;
      width: 118px;
      height: 118px;
      object-fit: contain;
      transition: transform .2s ease;
    }
    .rotate-button {
      box-sizing: border-box;
      justify-self: start;
      padding: 7px 11px;
      border: 1px solid #b7c6dc;
      border-radius: 7px;
      color: #164da8;
      background: #f4f8ff;
      cursor: pointer;
      font: 600 12px/1.2 inherit;
    }
    .box {
      display: grid;
      width: 24px;
      height: 24px;
      flex: 0 0 24px;
      place-items: center;
      border: 2px solid #7889a3;
      border-radius: 4px;
      background: white;
      transition: .18s ease;
    }
    :host([data-state="verifying"]) .box,
    :host([data-state="loading"]) .box {
      border-color: #1769ff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin .75s linear infinite;
    }
    :host([data-state="verified"]) .box { border-color: #168862; background: #168862; }
    :host([data-state="verified"]) .box::after {
      width: 6px;
      height: 11px;
      border: solid white;
      border-width: 0 2px 2px 0;
      content: "";
      transform: translateY(-1px) rotate(45deg);
    }
    .copy { display: grid; gap: 2px; }
    .label { font-size: 14px; font-weight: 600; }
    .status { color: #697b94; font-size: 11px; }
    .brand { display: grid; min-width: 52px; justify-items: center; }
    .brand-mark { display: block; width: 29px; height: 29px; }
    .brand-ring, .brand-check { fill: none; stroke: #1769ff; stroke-linecap: round; stroke-linejoin: round; }
    .brand-ring { stroke-width: 4.5; }
    .brand-check { stroke-width: 5; }
    .brand-t { fill: #0b1739; }
    .brand-name { display: block; margin-top: 2px; color: #71819a; font-size: 9px; letter-spacing: .02em; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { * { animation-duration: .001ms !important; } }
  </style>
  <div class="tc-shell">
    <div class="tc-widget">
      <button class="verify-button" data-role="verify" type="button" role="checkbox" aria-checked="false">
        <span class="box" aria-hidden="true"></span>
        <span class="copy">
          <span class="label" data-role="label"></span>
          <span class="status" data-role="status" aria-live="polite"></span>
        </span>
      </button>
      <span class="brand" aria-hidden="true">
        <svg class="brand-mark" viewBox="0 0 48 48" focusable="false">
          <path class="brand-ring" d="M34.8 40.2A18 18 0 1 1 41.7 26" />
          <path class="brand-t" d="M13 15.5h20v5.5h-7v16h-6V21h-7z" />
          <path class="brand-check" d="m28.5 32 5 5 10-12" />
        </svg>
        <span class="brand-name">TrustCaptcha</span>
      </span>
    </div>
    <section class="visual-panel" data-role="visual" hidden>
      <p class="visual-prompt" data-role="visual-prompt"></p>
      <div class="visual-frame"><img class="visual-image" data-role="visual-image" alt="" /></div>
      <button class="rotate-button" data-role="rotate" type="button"></button>
    </section>
  </div>
`;
