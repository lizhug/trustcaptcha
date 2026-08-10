import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    description:
      "Adaptive, privacy-aware human verification and bot protection.",
    display: "standalone",
    name: "TrustCaptcha",
    short_name: "TrustCaptcha",
    start_url: "/",
    theme_color: "#081633",
  };
}
