"use client";

import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import {
  ProDescriptions,
  ProTable,
  type ProColumns,
} from "@ant-design/pro-components";
import { App, Button, Drawer, Progress, Space, Tag, Typography } from "antd";
import { useRef, useState } from "react";

type LogStatus =
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED"
  | "REPLAYED"
  | "RATE_LIMITED"
  | "INVALID";
type VerificationLogRecord = {
  action: string;
  apiKey: { id: string; name: string; prefix: string } | null;
  apiLatencyMs: number;
  challengeId: string | null;
  createdAt: string;
  failureCode: string | null;
  id: string;
  ipAddress: string | null;
  ipHash: string;
  origin: string | null;
  requestId: string;
  riskReasons: string[];
  score: number | null;
  site: { id: string; name: string };
  status: LogStatus;
  tokenFingerprint: string | null;
  userAgent: string | null;
  userAgentHash: string | null;
  verificationDurationMs: number | null;
};

export function VerificationLogsTable() {
  const { message } = App.useApp();
  const filtersRef = useRef<Record<string, unknown>>({});
  const [selected, setSelected] = useState<VerificationLogRecord>();

  const columns: ProColumns<VerificationLogRecord>[] = [
    {
      dataIndex: "createdAtRange",
      hideInTable: true,
      title: "Time Range",
      valueType: "dateTimeRange",
    },
    {
      copyable: true,
      dataIndex: "requestId",
      ellipsis: true,
      title: "Request ID",
    },
    {
      dataIndex: "siteId",
      request: loadSiteOptions,
      title: "Site",
      valueType: "select",
      render: (_, record) => record.site.name,
    },
    {
      dataIndex: "action",
      title: "Action",
    },
    {
      dataIndex: "status",
      title: "Result",
      valueType: "select",
      valueEnum: {
        EXPIRED: { text: "Expired" },
        FAILED: { text: "Failed" },
        INVALID: { text: "Invalid" },
        RATE_LIMITED: { text: "Rate limited" },
        REPLAYED: { text: "Replayed" },
        SUCCESS: { text: "Success" },
      },
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      dataIndex: "ipAddress",
      ellipsis: true,
      search: false,
      title: "IP",
      renderText: (value) => value ?? "—",
    },
    {
      dataIndex: "userAgent",
      ellipsis: true,
      search: false,
      title: "User Agent",
      width: 220,
      renderText: (value) => value ?? "—",
    },
    {
      dataIndex: "score",
      search: false,
      title: "Score",
      render: (_, record) =>
        record.score === null ? (
          "—"
        ) : (
          <Progress
            percent={record.score}
            size="small"
            status={record.score >= 60 ? "success" : "exception"}
            style={{ minWidth: 110 }}
          />
        ),
    },
    {
      dataIndex: "riskReasons",
      search: false,
      title: "Risk Reasons",
      render: (_, record) =>
        record.riskReasons.length ? (
          <Space size={[0, 4]} wrap>
            {record.riskReasons.slice(0, 2).map((reason) => (
              <Tag key={reason}>{reason}</Tag>
            ))}
            {record.riskReasons.length > 2 ? (
              <Tag>+{record.riskReasons.length - 2}</Tag>
            ) : null}
          </Space>
        ) : (
          "—"
        ),
    },
    {
      dataIndex: "apiLatencyMs",
      search: false,
      title: "API Latency",
      renderText: (value) => `${value} ms`,
    },
    {
      dataIndex: "createdAt",
      search: false,
      title: "Created",
      valueType: "dateTime",
    },
    {
      key: "option",
      title: "Actions",
      valueType: "option",
      render: (_, record) => [
        <Button
          key="details"
          icon={<EyeOutlined />}
          size="small"
          type="link"
          onClick={() => setSelected(record)}
        >
          Details
        </Button>,
      ],
    },
  ];

  return (
    <>
      <ProTable<VerificationLogRecord>
        columns={columns}
        dateFormatter="iso"
        headerTitle="Verification Logs"
        options={{
          density: true,
          fullScreen: true,
          reload: true,
          setting: true,
        }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        request={async (params) => {
          filtersRef.current = params;
          const search = buildSearch(params, true);
          try {
            const response = await fetch(`/api/management/logs?${search}`, {
              cache: "no-store",
            });
            const payload = (await response.json()) as {
              data?: VerificationLogRecord[];
              total?: number;
            };
            if (!response.ok)
              throw new Error("Unable to load verification logs");
            return {
              data: payload.data ?? [],
              success: true,
              total: payload.total ?? 0,
            };
          } catch (error) {
            await message.error(
              error instanceof Error ? error.message : "Unable to load logs",
            );
            return { data: [], success: false, total: 0 };
          }
        }}
        rowKey="id"
        search={{ labelWidth: "auto" }}
        toolBarRender={() => [
          <Button
            key="export"
            icon={<DownloadOutlined />}
            onClick={() => {
              window.location.assign(
                `/api/management/logs/export?${buildSearch(filtersRef.current, false)}`,
              );
            }}
          >
            Export CSV
          </Button>,
        ]}
      />

      <Drawer
        destroyOnClose
        open={Boolean(selected)}
        size="large"
        title="Verification Details"
        onClose={() => setSelected(undefined)}
      >
        {selected ? (
          <ProDescriptions column={1} bordered dataSource={selected}>
            <ProDescriptions.Item label="Request ID" copyable valueType="text">
              {selected.requestId}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Status">
              <StatusTag status={selected.status} />
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Site">
              {selected.site.name}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Action">
              {selected.action}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Score">
              {selected.score ?? "—"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Failure Code">
              {selected.failureCode ?? "—"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Risk Reasons">
              {selected.riskReasons.length
                ? selected.riskReasons.join(", ")
                : "—"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Challenge ID" copyable>
              {selected.challengeId ?? "—"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Token Fingerprint" copyable>
              {selected.tokenFingerprint ?? "—"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="IP Hash" copyable>
              <Typography.Text code>{selected.ipHash}</Typography.Text>
            </ProDescriptions.Item>
            <ProDescriptions.Item label="IP (masked)">
              {selected.ipAddress ?? "—"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Origin">
              {selected.origin ?? "—"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="User Agent">
              {selected.userAgent ?? "—"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="API Key">
              {selected.apiKey?.name ?? "Site Secret"}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="API Latency">
              {selected.apiLatencyMs} ms
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Verification Duration">
              {selected.verificationDurationMs === null
                ? "—"
                : `${selected.verificationDurationMs} ms`}
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Created" valueType="dateTime">
              {selected.createdAt}
            </ProDescriptions.Item>
          </ProDescriptions>
        ) : null}
      </Drawer>
    </>
  );
}

function StatusTag({ status }: { status: LogStatus }) {
  const colors: Record<LogStatus, string> = {
    EXPIRED: "warning",
    FAILED: "error",
    INVALID: "error",
    RATE_LIMITED: "orange",
    REPLAYED: "magenta",
    SUCCESS: "success",
  };
  return (
    <Tag color={colors[status]}>
      {status.replaceAll("_", " ").toLowerCase()}
    </Tag>
  );
}

function buildSearch(params: Record<string, unknown>, paginated: boolean) {
  const search = new URLSearchParams();
  if (paginated) {
    search.set("current", String(params.current ?? 1));
    search.set("pageSize", String(params.pageSize ?? 20));
  }
  if (params.requestId) search.set("requestId", String(params.requestId));
  if (params.action) search.set("action", String(params.action));
  if (params.siteId) search.set("siteId", String(params.siteId));
  if (params.status) search.set("status", String(params.status));
  if (Array.isArray(params.createdAtRange)) {
    const [from, to] = params.createdAtRange;
    if (from) search.set("from", toIso(from));
    if (to) search.set("to", toIso(to));
  }
  return search;
}

function toIso(value: unknown) {
  if (typeof value === "string") return new Date(value).toISOString();
  if (value && typeof value === "object" && "toISOString" in value) {
    return (value as { toISOString(): string }).toISOString();
  }
  return String(value);
}

async function loadSiteOptions() {
  const response = await fetch("/api/management/sites?current=1&pageSize=100", {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    data?: Array<{ id: string; name: string }>;
  };
  return (payload.data ?? []).map((site) => ({
    label: site.name,
    value: site.id,
  }));
}
