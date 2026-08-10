"use client";

import { ProCard } from "@ant-design/pro-components";
import dynamic from "next/dynamic";

import type { DashboardMetrics } from "../../lib/dashboard/metrics";

const Area = dynamic(
  () => import("@ant-design/charts").then((module) => module.Area),
  { ssr: false },
);
const Column = dynamic(
  () => import("@ant-design/charts").then((module) => module.Column),
  { ssr: false },
);
const Line = dynamic(
  () => import("@ant-design/charts").then((module) => module.Line),
  { ssr: false },
);

export function DashboardCharts({ metrics }: { metrics: DashboardMetrics }) {
  const successTrend = metrics.trend.map((item) => ({
    date: item.date.slice(5),
    rate:
      item.total === 0
        ? 0
        : Number(((item.success / item.total) * 100).toFixed(1)),
  }));

  return (
    <div className="dashboard-chart-grid">
      <ProCard bordered title="Request trend">
        <Area
          data={metrics.trend}
          height={260}
          xField="date"
          yField="total"
          axis={{ x: { labelFormatter: (value: string) => value.slice(5) } }}
          style={{ fill: "linear-gradient(-90deg, white 0%, #1769ff 100%)" }}
        />
      </ProCard>
      <ProCard bordered title="Verification success rate">
        <Line
          data={successTrend}
          height={260}
          xField="date"
          yField="rate"
          axis={{ y: { labelFormatter: (value: string) => `${value}%` } }}
          scale={{ y: { domain: [0, 100] } }}
          style={{ lineWidth: 3, stroke: "#1a936f" }}
        />
      </ProCard>
      <ProCard
        bordered
        className="dashboard-risk-card"
        title="Risk distribution"
      >
        <Column
          data={metrics.riskDistribution}
          height={260}
          xField="bucket"
          yField="count"
          colorField="bucket"
          legend={false}
          scale={{
            color: {
              range: ["#e85252", "#f0a202", "#4d8fea", "#1a936f", "#a6afbd"],
            },
          }}
        />
      </ProCard>
      <ProCard bordered title="Verification by action">
        <Column
          data={metrics.actionBreakdown}
          height={260}
          xField="action"
          yField="total"
          colorField="action"
          legend={false}
          axis={{ x: { labelAutoRotate: true } }}
          tooltip={{
            items: [
              { field: "total", name: "Requests" },
              { field: "success", name: "Successful" },
              { field: "averageScore", name: "Average score" },
            ],
          }}
        />
      </ProCard>
    </div>
  );
}
