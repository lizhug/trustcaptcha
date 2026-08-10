import type {
  TrustCaptchaRenderOptions,
  TrustCaptchaWidgetHandle,
} from "@trustcaptcha/sdk/types";

declare global {
  interface Window {
    TrustCaptcha?: {
      render(options: TrustCaptchaRenderOptions): TrustCaptchaWidgetHandle;
    };
  }
}

export {};
