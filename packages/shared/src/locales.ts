export const supportedLocales = [
  "auto",
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "es",
  "pt-BR",
  "de",
  "fr",
] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const localeLabels: Record<SupportedLocale, string> = {
  auto: "Auto",
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  de: "Deutsch",
  fr: "Français",
};
