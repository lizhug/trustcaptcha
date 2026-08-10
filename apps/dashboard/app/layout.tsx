import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { DashboardProviders } from "./providers";

export const metadata: Metadata = {
  title: "TrustCaptcha Dashboard",
  description: "Manage TrustCaptcha sites, credentials and verification data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <DashboardProviders>{children}</DashboardProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
