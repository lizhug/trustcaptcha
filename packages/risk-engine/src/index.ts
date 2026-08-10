import type { InteractionSignals } from "@trustcaptcha/shared";

export type RiskReason =
  | "CLICK_TIMING_ANOMALY"
  | "COOKIE_UNAVAILABLE"
  | "FOCUS_INSTABILITY"
  | "INPUT_METHOD_UNKNOWN"
  | "INTERACTION_MISSING"
  | "INTERACTION_UNTRUSTED"
  | "POINTER_LINEAR"
  | "POINTER_STATIC"
  | "POW_INVALID"
  | "RATE_CRITICAL"
  | "RATE_HIGH"
  | "SESSION_INCONSISTENT"
  | "TOO_FAST"
  | "TOO_SLOW"
  | "UA_AUTOMATED"
  | "UA_MISSING";

export type RiskContext = {
  cookieEnabled: boolean;
  interaction?: InteractionSignals;
  ipRequestCount: number;
  proofOfWorkRequired: boolean;
  proofOfWorkValid: boolean;
  sessionConsistent: boolean;
  userAgent: string | null;
  verificationDurationMs: number;
  verificationMode: "checkbox" | "invisible";
};

export type RiskResult = {
  reasons: RiskReason[];
  score: number;
};

export interface RiskEngine {
  evaluate(context: RiskContext): Promise<RiskResult>;
}

const AUTOMATION_PATTERN =
  /(?:bot|crawler|spider|headless|phantomjs|selenium|playwright|puppeteer)/i;

export class RuleBasedRiskEngine implements RiskEngine {
  async evaluate(context: RiskContext): Promise<RiskResult> {
    let score = 100;
    const reasons: RiskReason[] = [];

    if (context.ipRequestCount > 100) {
      score -= 40;
      reasons.push("RATE_CRITICAL");
    } else if (context.ipRequestCount > 30) {
      score -= 20;
      reasons.push("RATE_HIGH");
    }

    if (!context.userAgent?.trim()) {
      score -= 25;
      reasons.push("UA_MISSING");
    } else if (AUTOMATION_PATTERN.test(context.userAgent)) {
      score -= 35;
      reasons.push("UA_AUTOMATED");
    }

    if (!context.cookieEnabled) {
      score -= 5;
      reasons.push("COOKIE_UNAVAILABLE");
    }

    if (!context.sessionConsistent) {
      score -= 40;
      reasons.push("SESSION_INCONSISTENT");
    }

    if (context.proofOfWorkRequired && !context.proofOfWorkValid) {
      score = 0;
      reasons.push("POW_INVALID");
    }

    const interaction = context.interaction;
    if (context.verificationMode === "checkbox" && !interaction) {
      score -= 20;
      reasons.push("INTERACTION_MISSING");
    } else if (context.verificationMode === "checkbox" && interaction) {
      if (!interaction.trustedEvent) {
        score -= 45;
        reasons.push("INTERACTION_UNTRUSTED");
      }

      if (interaction.inputMethod === "unknown") {
        score -= 15;
        reasons.push("INPUT_METHOD_UNKNOWN");
      }

      if (interaction.inputMethod === "mouse") {
        if (interaction.moveEvents < 2 || interaction.pointerDistancePx < 8) {
          score -= 20;
          reasons.push("POINTER_STATIC");
        } else if (
          interaction.moveEvents >= 8 &&
          interaction.pathEfficiency >= 98 &&
          interaction.directionChanges <= 1
        ) {
          score -= 10;
          reasons.push("POINTER_LINEAR");
        }
      }

      if (
        interaction.inputMethod !== "keyboard" &&
        (interaction.clickDurationMs < 15 ||
          interaction.clickDurationMs > 2_500)
      ) {
        score -= 10;
        reasons.push("CLICK_TIMING_ANOMALY");
      }

      if (interaction.focusChanges + interaction.visibilityChanges > 8) {
        score -= 10;
        reasons.push("FOCUS_INSTABILITY");
      }
    }

    if (
      context.verificationMode === "checkbox" &&
      context.verificationDurationMs < 400
    ) {
      score -= 30;
      reasons.push("TOO_FAST");
    } else if (context.verificationDurationMs > 5 * 60 * 1_000) {
      score -= 15;
      reasons.push("TOO_SLOW");
    }

    return { reasons, score: Math.max(0, Math.min(100, score)) };
  }
}
