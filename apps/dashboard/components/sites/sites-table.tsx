"use client";

import { PlusOutlined } from "@ant-design/icons";
import {
  DrawerForm,
  ModalForm,
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

type SiteStatus = "ACTIVE" | "DISABLED";

type SiteRecord = {
  createdAt: string;
  defaultLocale: string;
  domain: string;
  id: string;
  name: string;
  secretLastFour: string;
  secretPrefix: string;
  siteKey: string;
  status: SiteStatus;
  supportedLocales: string[];
  updatedAt: string;
};

type CreateSiteResult = SiteRecord & { secretKey: string };

type SiteFormValues = {
  defaultLocale?: string;
  domain: string;
  name: string;
  status?: SiteStatus;
  supportedLocales?: string[];
};

const localeOptions = [
  ["auto", "Auto detect"],
  ["en", "English"],
  ["zh-CN", "简体中文"],
  ["zh-TW", "繁體中文"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["es", "Español"],
  ["pt-BR", "Português (Brasil)"],
  ["de", "Deutsch"],
  ["fr", "Français"],
].map(([value, label]) => ({ label, value }));

type SecretState = {
  oneTime: boolean;
  siteKey?: string;
  siteName: string;
  value: string;
};

export function SitesTable({
  canDelete,
  onboarding = false,
}: {
  canDelete: boolean;
  onboarding?: boolean;
}) {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { message } = App.useApp();
  const [createOpen, setCreateOpen] = useState(onboarding);
  const [editing, setEditing] = useState<SiteRecord>();
  const [secret, setSecret] = useState<SecretState>();

  async function createSite(values: SiteFormValues) {
    try {
      const created = await managementRequest<CreateSiteResult>(
        "/api/management/sites",
        { method: "POST", body: JSON.stringify(values) },
      );
      setSecret({
        oneTime: true,
        siteKey: created.siteKey,
        siteName: created.name,
        value: created.secretKey,
      });
      actionRef.current?.reload();
      await message.success("Site created");
      return true;
    } catch (error) {
      await message.error(readError(error));
      return false;
    }
  }

  async function editSite(values: SiteFormValues) {
    if (!editing) return false;
    try {
      await managementRequest<SiteRecord>(
        `/api/management/sites/${editing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(values),
        },
      );
      actionRef.current?.reload();
      setEditing(undefined);
      await message.success("Site updated");
      return true;
    } catch (error) {
      await message.error(readError(error));
      return false;
    }
  }

  async function removeSite(record: SiteRecord) {
    try {
      await managementRequest<void>(`/api/management/sites/${record.id}`, {
        method: "DELETE",
      });
      actionRef.current?.reload();
      await message.success("Site deleted");
    } catch (error) {
      await message.error(readError(error));
    }
  }

  const columns: ProColumns<SiteRecord>[] = [
    { title: "Site Name", dataIndex: "name", ellipsis: true },
    { title: "Domain", dataIndex: "domain", copyable: true, ellipsis: true },
    {
      title: "Site Key",
      dataIndex: "siteKey",
      copyable: true,
      ellipsis: true,
      search: false,
    },
    {
      title: "Status",
      dataIndex: "status",
      valueType: "select",
      valueEnum: {
        ACTIVE: { text: "Active", status: "Success" },
        DISABLED: { text: "Disabled", status: "Default" },
      },
      render: (_, record) => (
        <Tag color={record.status === "ACTIVE" ? "success" : "default"}>
          {record.status === "ACTIVE" ? "Active" : "Disabled"}
        </Tag>
      ),
    },
    {
      title: "Created Time",
      dataIndex: "createdAt",
      valueType: "dateTime",
      search: false,
      sorter: false,
    },
    {
      title: "Actions",
      valueType: "option",
      key: "option",
      render: (_, record) => [
        <Button
          key="edit"
          size="small"
          type="link"
          onClick={() => setEditing(record)}
        >
          Edit
        </Button>,
        <Button
          key="secret"
          size="small"
          type="link"
          onClick={() =>
            setSecret({
              oneTime: false,
              siteName: record.name,
              value: `${record.secretPrefix}_••••${record.secretLastFour}`,
            })
          }
        >
          Secret
        </Button>,
        canDelete ? (
          <Popconfirm
            key="delete"
            description="Existing integrations will stop accepting this site."
            okButtonProps={{ danger: true }}
            okText="Delete"
            title={`Delete ${record.name}?`}
            onConfirm={() => removeSite(record)}
          >
            <Button danger size="small" type="link">
              Delete
            </Button>
          </Popconfirm>
        ) : null,
      ],
    },
  ];

  return (
    <>
      {onboarding ? (
        <Alert
          showIcon
          type="success"
          message="Workspace created — add your first site"
          description="Enter the exact origin where the widget will run. Your Site Key is public; the Secret Key is shown once and belongs only on your server."
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <ProTable<SiteRecord>
        actionRef={actionRef}
        columns={columns}
        headerTitle="Sites"
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
          if (params.domain) search.set("domain", String(params.domain));
          if (params.status) search.set("status", String(params.status));

          try {
            const response = await fetch(`/api/management/sites?${search}`, {
              cache: "no-store",
            });
            const payload = (await response.json()) as {
              data?: SiteRecord[];
              total?: number;
            };
            if (!response.ok) throw new Error("Unable to load sites");
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
            Create Site
          </Button>,
        ]}
      />

      <ModalForm<SiteFormValues>
        modalProps={{ destroyOnHidden: true }}
        open={createOpen}
        title="Create Site"
        onFinish={createSite}
        onOpenChange={setCreateOpen}
      >
        <ProFormText
          label="Site Name"
          name="name"
          placeholder="Marketing website"
          rules={[{ required: true }, { min: 2, max: 120 }]}
        />
        <ProFormText
          label="Domain"
          name="domain"
          placeholder="example.com"
          rules={[{ required: true }]}
          tooltip="HTTPS is required except for localhost development."
        />
      </ModalForm>

      <DrawerForm<SiteFormValues>
        key={editing?.id ?? "closed"}
        drawerProps={{ destroyOnClose: true }}
        initialValues={editing}
        open={Boolean(editing)}
        title={`Edit ${editing?.name ?? "site"}`}
        onFinish={editSite}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <ProFormText
          label="Site Name"
          name="name"
          rules={[{ required: true }]}
        />
        <ProFormText
          label="Domain"
          name="domain"
          rules={[{ required: true }]}
        />
        <ProFormSelect
          label="Status"
          name="status"
          options={[
            { label: "Active", value: "ACTIVE" },
            { label: "Disabled", value: "DISABLED" },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormSelect
          label="Widget default language"
          name="defaultLocale"
          options={localeOptions}
          rules={[{ required: true }]}
          tooltip="Auto detect follows the visitor's browser language."
        />
        <ProFormSelect
          fieldProps={{ mode: "multiple" }}
          label="Enabled widget languages"
          name="supportedLocales"
          options={localeOptions}
          rules={[{ required: true }]}
        />
      </DrawerForm>

      <Modal
        destroyOnHidden
        footer={
          <Button type="primary" onClick={() => setSecret(undefined)}>
            I have saved it
          </Button>
        }
        open={Boolean(secret)}
        title={
          secret?.oneTime ? "Save your Secret Key" : "Secret Key information"
        }
        onCancel={() => setSecret(undefined)}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {secret?.oneTime ? (
            <Alert
              showIcon
              type="warning"
              message="This Secret Key is shown only once. Store it in your server-side secret manager now."
            />
          ) : (
            <Alert
              showIcon
              type="info"
              message="TrustCaptcha never stores the plaintext Secret Key. If it was lost, rotate it instead of trying to reveal it."
            />
          )}
          <Typography.Text strong>{secret?.siteName}</Typography.Text>
          <Typography.Text code copyable={Boolean(secret?.oneTime)}>
            {secret?.value}
          </Typography.Text>
          {secret?.oneTime && secret.siteKey ? (
            <>
              <Typography.Text strong>Browser quickstart</Typography.Text>
              <Typography.Paragraph copyable code>
                {`<script src="https://api.trustcaptcha.xuandev.com/v1/api.js" async defer></script>\n<div class="trust-captcha" data-sitekey="${secret.siteKey}" data-action="signup"></div>`}
              </Typography.Paragraph>
              <Typography.Link
                href="https://trustcaptcha.xuandev.com/docs"
                target="_blank"
              >
                Open complete integration guide
              </Typography.Link>
            </>
          ) : null}
        </Space>
      </Modal>
    </>
  );
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

function readError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong";
  const messages: Record<string, string> = {
    INVALID_DOMAIN: "Enter a valid HTTPS domain without a path.",
    INVALID_INPUT: "Review the form and try again.",
    INVALID_ORIGIN: "The request origin could not be verified.",
    SITE_DOMAIN_EXISTS:
      "This domain already belongs to a site in your workspace.",
  };
  return messages[error.message] ?? error.message;
}
