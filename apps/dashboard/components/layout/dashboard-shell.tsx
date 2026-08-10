"use client";

import {
  ApiOutlined,
  ControlOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { ProLayout } from "@ant-design/pro-components";
import { Dropdown } from "antd";
import type { ReactNode } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DashboardRole } from "../../lib/auth/permissions";

const route = {
  path: "/",
  routes: [
    { path: "/", name: "Overview", icon: <DashboardOutlined /> },
    { path: "/sites", name: "Sites", icon: <SafetyCertificateOutlined /> },
    { path: "/logs", name: "Verification Logs", icon: <FileSearchOutlined /> },
    { path: "/api-keys", name: "API Keys", icon: <ApiOutlined /> },
    { path: "/security", name: "Verification", icon: <ControlOutlined /> },
    { path: "/billing", name: "Plans & Billing", icon: <DollarOutlined /> },
  ],
};

type DashboardShellProps = {
  children: ReactNode;
  customerName: string;
  role: DashboardRole;
  userName: string;
};

export function DashboardShell({
  children,
  customerName,
  role,
  userName,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <ProLayout
      avatarProps={{
        size: "small",
        title: userName,
        render: (_, avatar) => (
          <Dropdown
            menu={{
              items: [
                { key: "workspace", label: customerName, disabled: true },
                { type: "divider" },
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Sign out",
                  onClick: () => signOut({ callbackUrl: "/login" }),
                },
              ],
            }}
            placement="bottomRight"
          >
            {avatar}
          </Dropdown>
        ),
      }}
      contentStyle={{ paddingBlock: 24 }}
      fixSiderbar
      fixedHeader
      layout="mix"
      location={{ pathname }}
      logo={<span className="brand-mark">TC</span>}
      menu={{ autoClose: false }}
      menuItemRender={(item, dom) =>
        item.path ? <Link href={item.path}>{dom}</Link> : dom
      }
      route={route}
      siderWidth={248}
      title="TrustCaptcha"
      token={{
        bgLayout: "#f2f5f9",
        header: { colorBgHeader: "#0f1b33", colorHeaderTitle: "#ffffff" },
        sider: { colorMenuBackground: "#ffffff" },
      }}
    >
      <div className="dashboard-content" data-role={role}>
        {children}
      </div>
    </ProLayout>
  );
}
