"use client";

import { ProCard } from "@ant-design/pro-components";
import { Typography } from "antd";

export function PendingPage({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <ProCard bordered>
      <Typography.Title level={2}>{title}</Typography.Title>
      <Typography.Paragraph>{description}</Typography.Paragraph>
    </ProCard>
  );
}
