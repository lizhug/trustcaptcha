"use client";

import { CheckCircleFilled } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Progress,
  Radio,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

type PlanTier = "FREE" | "PRO" | "SCALE" | "PRIVATE";
type Summary = {
  configured: { checkout: boolean; portal: boolean; webhook: boolean };
  entitlements: {
    dataRetentionDays: number;
    monthlyRequests: number;
    maxSites: number;
    brandedChallenges: boolean;
  };
  monthlyUsage: number;
  planTier: PlanTier;
  pricing: Record<PlanTier, { monthlyUsd: number; yearlyUsd: number }>;
  subscription: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    status: string;
  } | null;
  usagePercent: number;
};

const planFeatures: Record<PlanTier, string[]> = {
  FREE: [
    "250,000 requests / month",
    "14-day verification log retention",
    "3 sites",
    "Managed, checkbox and invisible modes",
  ],
  PRO: [
    "2 million requests / month",
    "90-day retention",
    "25 sites",
    "20 branded visual assets",
  ],
  SCALE: [
    "10 million requests / month",
    "365-day retention",
    "100 sites",
    "100 brand assets + priority support",
  ],
  PRIVATE: [
    "Private deployment package",
    "10-year configurable retention",
    "Dedicated scale envelope",
    "Priority architecture and migration support",
  ],
};

export function BillingCenter({ canManage }: { canManage: boolean }) {
  const { message } = App.useApp();
  const [summary, setSummary] = useState<Summary>();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [busy, setBusy] = useState<PlanTier>();

  useEffect(() => {
    void api<Summary>("/api/billing/summary")
      .then(setSummary)
      .catch((error) => message.error(readError(error)));
  }, [message]);

  async function checkout(planTier: PlanTier) {
    if (planTier === "FREE") return;
    setBusy(planTier);
    try {
      const result = await api<{ checkoutUrl: string }>(
        "/api/billing/checkout",
        {
          body: JSON.stringify({ billingCycle: cycle, planTier }),
          method: "POST",
        },
      );
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      await message.error(readError(error));
      setBusy(undefined);
    }
  }

  async function openPortal() {
    try {
      const result = await api<{ portalUrl: string }>("/api/billing/portal", {
        method: "POST",
      });
      window.location.assign(result.portalUrl);
    } catch (error) {
      await message.error(readError(error));
    }
  }

  if (!summary) return <Spin size="large" />;

  return (
    <Space direction="vertical" size={22} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2}>Plans & usage</Typography.Title>
        <Typography.Text type="secondary">
          Low-cost bot protection with unusually generous free capacity.
          Payments and tax receipts are handled by Creem.
        </Typography.Text>
      </div>
      {!summary.configured.checkout && (
        <Alert
          message="Creem test checkout is ready for product IDs"
          description="Add CREEM_API_KEY, CREEM_WEBHOOK_SECRET and the six plan product IDs to activate checkout. Until then pricing remains visible without accepting payment."
          showIcon
          type="warning"
        />
      )}
      <Card>
        <Row align="middle" gutter={[24, 18]}>
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Space>
                <Typography.Text strong>
                  Current plan: {summary.planTier}
                </Typography.Text>
                <Tag color="blue">
                  {summary.subscription?.status ?? "ACTIVE"}
                </Tag>
              </Space>
              <Typography.Text type="secondary">
                {summary.monthlyUsage.toLocaleString()} of{" "}
                {summary.entitlements.monthlyRequests.toLocaleString()} requests
                this month
              </Typography.Text>
            </Space>
            <Progress
              percent={summary.usagePercent}
              showInfo
              style={{ maxWidth: 680 }}
            />
          </Col>
          <Col>
            <Button
              disabled={!summary.configured.portal || !canManage}
              onClick={() => void openPortal()}
            >
              Manage billing
            </Button>
          </Col>
        </Row>
      </Card>
      <div style={{ textAlign: "center" }}>
        <Radio.Group
          onChange={(event) => setCycle(event.target.value)}
          optionType="button"
          value={cycle}
        >
          <Radio.Button value="monthly">Monthly</Radio.Button>
          <Radio.Button value="yearly">Yearly · save up to 17%</Radio.Button>
        </Radio.Group>
      </div>
      <Row gutter={[16, 16]}>
        {(["FREE", "PRO", "SCALE", "PRIVATE"] as const).map((tier) => {
          const price =
            summary.pricing[tier][
              cycle === "monthly" ? "monthlyUsd" : "yearlyUsd"
            ];
          const current = summary.planTier === tier;
          return (
            <Col key={tier} lg={6} md={12} xs={24}>
              <Card
                bordered={tier !== "PRO"}
                style={
                  tier === "PRO"
                    ? { border: "2px solid #1769ff", height: "100%" }
                    : { height: "100%" }
                }
              >
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <div>
                    <Space>
                      <Typography.Title level={3} style={{ margin: 0 }}>
                        {tier === "PRIVATE"
                          ? "Private Cloud"
                          : tier[0] + tier.slice(1).toLowerCase()}
                      </Typography.Title>
                      {tier === "PRO" && <Tag color="blue">Popular</Tag>}
                    </Space>
                    <div>
                      <Typography.Title
                        level={2}
                        style={{ margin: "10px 0 0" }}
                      >
                        ${price}
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        /{cycle === "monthly" ? "month" : "year"}
                      </Typography.Text>
                    </div>
                  </div>
                  <Space direction="vertical">
                    {planFeatures[tier].map((feature) => (
                      <Typography.Text key={feature}>
                        <CheckCircleFilled
                          style={{ color: "#168862", marginRight: 8 }}
                        />
                        {feature}
                      </Typography.Text>
                    ))}
                  </Space>
                  <Button
                    block
                    disabled={
                      current ||
                      tier === "FREE" ||
                      !canManage ||
                      !summary.configured.checkout
                    }
                    loading={busy === tier}
                    onClick={() => void checkout(tier)}
                    type={tier === "PRO" ? "primary" : "default"}
                  >
                    {current
                      ? "Current plan"
                      : tier === "FREE"
                        ? "Free forever"
                        : `Choose ${tier === "PRIVATE" ? "Private" : tier}`}
                  </Button>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Typography.Paragraph type="secondary">
        Request quotas reset monthly in UTC. Retention controls verification
        logs; audit and billing records follow security and legal retention
        requirements. Private deployment terms are finalized during onboarding.
      </Typography.Paragraph>
    </Space>
  );
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok || !payload.success)
    throw new Error(payload.errorCodes?.[0] ?? "REQUEST_FAILED");
  return payload.data as T;
}

function readError(error: unknown) {
  return error instanceof Error
    ? error.message.replaceAll("_", " ").toLowerCase()
    : "Request failed";
}
