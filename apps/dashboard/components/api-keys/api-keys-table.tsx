"use client";

import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import {
  ModalForm,
  ProFormCheckbox,
  ProFormDateTimePicker,
  ProFormSelect,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from "antd";
import { useRef, useState } from "react";

type ApiKeyStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
type ApiKeyRecord = {
  createdAt: string;
  expiresAt: string | null;
  id: string;
  lastFour: string;
  lastUsedAt: string | null;
  name: string;
  prefix: string;
  scopes: string[];
  site: { id: string; name: string } | null;
  status: ApiKeyStatus;
};
type ApiKeyResult = ApiKeyRecord & {
  apiKey: string;
  previousKeyExpiresAt?: string;
};
type ApiKeyForm = {
  expiresAt?: { toISOString(): string } | string;
  name: string;
  scopes: string[];
  siteId?: string;
};
type SecretState = { description: string; name: string; value: string };

export function ApiKeysTable() {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { message, modal } = App.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState<SecretState>();

  async function createKey(values: ApiKeyForm) {
    try {
      const created = await managementRequest<ApiKeyResult>(
        "/api/management/api-keys",
        {
          body: JSON.stringify({
            ...values,
            expiresAt:
              typeof values.expiresAt === "string"
                ? values.expiresAt
                : values.expiresAt?.toISOString(),
            siteId: values.siteId || null,
          }),
          method: "POST",
        },
      );
      setSecret({
        description:
          "This API Key is shown only once. Store it in your server-side secret manager now.",
        name: created.name,
        value: created.apiKey,
      });
      actionRef.current?.reload();
      await message.success("API key created");
      return true;
    } catch (error) {
      await message.error(readError(error));
      return false;
    }
  }

  async function rotateKey(record: ApiKeyRecord) {
    modal.confirm({
      content:
        "The current key remains valid for five minutes so you can deploy the replacement without downtime.",
      okText: "Rotate key",
      title: `Rotate ${record.name}?`,
      onOk: async () => {
        try {
          const rotated = await managementRequest<ApiKeyResult>(
            `/api/management/api-keys/${record.id}/rotate`,
            {
              body: JSON.stringify({ gracePeriodSeconds: 300 }),
              method: "POST",
            },
          );
          setSecret({
            description: `Save this replacement now. The previous key expires at ${new Date(
              rotated.previousKeyExpiresAt ?? Date.now(),
            ).toLocaleString()}.`,
            name: rotated.name,
            value: rotated.apiKey,
          });
          actionRef.current?.reload();
          await message.success("API key rotated");
        } catch (error) {
          await message.error(readError(error));
          throw error;
        }
      },
    });
  }

  async function deleteKey(record: ApiKeyRecord) {
    try {
      await managementRequest<void>(`/api/management/api-keys/${record.id}`, {
        method: "DELETE",
      });
      actionRef.current?.reload();
      await message.success("API key deleted");
    } catch (error) {
      await message.error(readError(error));
    }
  }

  const columns: ProColumns<ApiKeyRecord>[] = [
    { dataIndex: "name", title: "Name", ellipsis: true },
    {
      dataIndex: "prefix",
      title: "Key",
      search: false,
      render: (_, record) => (
        <Typography.Text
          code
        >{`${record.prefix}_••••${record.lastFour}`}</Typography.Text>
      ),
    },
    {
      dataIndex: "siteId",
      title: "Site",
      valueType: "select",
      request: loadSiteOptions,
      render: (_, record) => record.site?.name ?? "All sites",
    },
    {
      dataIndex: "scopes",
      title: "Scopes",
      search: false,
      render: (_, record) => (
        <Space size={[0, 4]} wrap>
          {record.scopes.map((scope) => (
            <Tag key={scope}>{scope}</Tag>
          ))}
        </Space>
      ),
    },
    {
      dataIndex: "status",
      title: "Status",
      valueType: "select",
      valueEnum: {
        ACTIVE: { status: "Success", text: "Active" },
        EXPIRED: { status: "Warning", text: "Expired" },
        REVOKED: { status: "Error", text: "Revoked" },
      },
      render: (_, record) => (
        <Tag
          color={
            record.status === "ACTIVE"
              ? "success"
              : record.status === "EXPIRED"
                ? "warning"
                : "error"
          }
        >
          {record.status.toLowerCase()}
        </Tag>
      ),
    },
    {
      dataIndex: "lastUsedAt",
      title: "Last Used",
      valueType: "dateTime",
      search: false,
    },
    {
      dataIndex: "expiresAt",
      title: "Expires",
      valueType: "dateTime",
      search: false,
    },
    {
      key: "option",
      title: "Actions",
      valueType: "option",
      render: (_, record) =>
        record.status === "ACTIVE"
          ? [
              <Button
                key="rotate"
                icon={<SyncOutlined />}
                size="small"
                type="link"
                onClick={() => rotateKey(record)}
              >
                Rotate
              </Button>,
              <Popconfirm
                key="delete"
                description="The credential will be revoked immediately and retained only as an audit record. This cannot be undone."
                okButtonProps={{ danger: true }}
                okText="Delete"
                title={`Delete ${record.name}?`}
                onConfirm={() => deleteKey(record)}
              >
                <Button danger size="small" type="link">
                  Delete
                </Button>
              </Popconfirm>,
            ]
          : [],
    },
  ];

  return (
    <>
      <ProTable<ApiKeyRecord>
        actionRef={actionRef}
        columns={columns}
        headerTitle="API Keys"
        options={{
          density: true,
          fullScreen: true,
          reload: true,
          setting: true,
        }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        request={async (params) => {
          const search = new URLSearchParams();
          search.set("current", String(params.current ?? 1));
          search.set("pageSize", String(params.pageSize ?? 20));
          if (params.name) search.set("name", String(params.name));
          if (params.siteId) search.set("siteId", String(params.siteId));
          if (params.status) search.set("status", String(params.status));
          try {
            const response = await fetch(`/api/management/api-keys?${search}`, {
              cache: "no-store",
            });
            const payload = (await response.json()) as {
              data?: ApiKeyRecord[];
              total?: number;
            };
            if (!response.ok) throw new Error("Unable to load API keys");
            return {
              data: payload.data ?? [],
              success: true,
              total: payload.total ?? 0,
            };
          } catch (error) {
            await message.error(readError(error));
            return { data: [], success: false, total: 0 };
          }
        }}
        rowKey="id"
        search={{ labelWidth: "auto" }}
        toolBarRender={() => [
          <Button
            key="create"
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => setCreateOpen(true)}
          >
            Create API Key
          </Button>,
        ]}
      />

      <ModalForm<ApiKeyForm>
        initialValues={{ scopes: ["VERIFY"] }}
        modalProps={{ destroyOnHidden: true }}
        open={createOpen}
        title="Create API Key"
        onFinish={createKey}
        onOpenChange={setCreateOpen}
      >
        <ProFormText
          label="Name"
          name="name"
          rules={[{ required: true }, { min: 2, max: 120 }]}
        />
        <ProFormSelect
          allowClear
          label="Restrict to Site"
          name="siteId"
          placeholder="All sites"
          request={loadSiteOptions}
          tooltip="A site-restricted key cannot verify tokens issued for another site."
        />
        <ProFormCheckbox.Group
          label="Scopes"
          name="scopes"
          options={[
            { label: "Verify tokens", value: "VERIFY" },
            { label: "Read logs", value: "READ_LOGS" },
            { label: "Manage sites", value: "MANAGE_SITES" },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormDateTimePicker label="Expires At" name="expiresAt" />
      </ModalForm>

      <Modal
        destroyOnHidden
        footer={
          <Button type="primary" onClick={() => setSecret(undefined)}>
            I have saved it
          </Button>
        }
        open={Boolean(secret)}
        title="Save your API Key"
        onCancel={() => setSecret(undefined)}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert showIcon type="warning" message={secret?.description} />
          <Typography.Text strong>{secret?.name}</Typography.Text>
          <Typography.Text code copyable>
            {secret?.value}
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
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

async function managementRequest<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as {
    data?: T;
    errorCodes?: string[];
  };
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.errorCodes?.[0] ?? "REQUEST_FAILED");
  }
  return payload.data;
}

function readError(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong";
  const messages: Record<string, string> = {
    EXPIRY_MUST_BE_FUTURE: "Choose an expiry time in the future.",
    ROTATION_ALREADY_STARTED: "This key has already been rotated.",
    SITE_NOT_FOUND: "The selected site no longer exists.",
  };
  return messages[error.message] ?? error.message;
}
