"use client";

import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Statistic, Tag, Typography } from "antd";

import type { DashboardMetrics } from "../../lib/dashboard/metrics";
import { DashboardCharts } from "./dashboard-charts";

export function DashboardOverview({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="dashboard-overview">
      <div className="dashboard-page-heading">
        <div>
          <Typography.Title level={2}>Verification overview</Typography.Title>
          <Typography.Paragraph>
            Last 30 days across every site in this workspace.
          </Typography.Paragraph>
        </div>
        <Tag color="processing">Live tenant data</Tag>
      </div>

      <ProCard bordered gutter={[16, 16]} wrap>
        <ProCard colSpan={{ xs: 24, sm: 12, lg: 6 }}>
          <Statistic title="Total Requests" value={metrics.totalRequests} />
        </ProCard>
        <ProCard colSpan={{ xs: 24, sm: 12, lg: 6 }}>
          <Statistic
            prefix={<ArrowUpOutlined />}
            suffix="%"
            title="Success Rate"
            value={metrics.successRate}
            valueStyle={{ color: "#1a936f" }}
          />
        </ProCard>
        <ProCard colSpan={{ xs: 24, sm: 12, lg: 6 }}>
          <Statistic
            prefix={<ArrowDownOutlined />}
            title="Failed Requests"
            value={metrics.failedRequests}
            valueStyle={{
              color: metrics.failedRequests > 0 ? "#d84a4a" : undefined,
            }}
          />
        </ProCard>
        <ProCard colSpan={{ xs: 24, sm: 12, lg: 6 }}>
          <Statistic
            suffix="/ 100"
            title="Average Risk Score"
            value={metrics.averageRiskScore}
          />
        </ProCard>
      </ProCard>

      <DashboardCharts metrics={metrics} />
    </div>
  );
}
