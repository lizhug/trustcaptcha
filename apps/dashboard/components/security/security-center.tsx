"use client";

import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  List,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import { useEffect, useState } from "react";

type Site = { id: string; name: string; domain: string };
type Policy = {
  action: string;
  allowedChallenges: string[];
  failMode: "CLOSED" | "OPEN";
  immunitySeconds: number;
  maxAttempts: number;
  mode: string;
  preset: "CONVERSION" | "BALANCED" | "STRICT" | "CUSTOM";
  riskThreshold: number | null;
};
type BrandAsset = {
  altText: string;
  byteSize: number;
  createdAt: string;
  id: string;
  mimeType: string;
  name: string;
};

const presetDefaults = {
  CONVERSION: { allowedChallenges: ["POW"], mode: "INVISIBLE" },
  BALANCED: { allowedChallenges: ["POW", "CHECKBOX"], mode: "MANAGED" },
  STRICT: {
    allowedChallenges: ["POW", "CHECKBOX", "VISUAL"],
    mode: "CHECKBOX",
  },
  CUSTOM: { allowedChallenges: ["POW", "CHECKBOX"], mode: "MANAGED" },
};

export function SecurityCenter({ canWrite }: { canWrite: boolean }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState<string>();
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<UploadFile[]>([]);

  useEffect(() => {
    void request<Site[]>("/api/management/sites?current=1&pageSize=100")
      .then((result) => {
        setSites(result);
        setSiteId(result[0]?.id);
      })
      .catch((error) => message.error(readError(error)))
      .finally(() => setLoading(false));
  }, [message]);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    Promise.all([
      request<Policy[]>(`/api/management/policies?siteId=${siteId}`),
      request<BrandAsset[]>(`/api/management/brand-assets?siteId=${siteId}`),
    ])
      .then(([policies, nextAssets]) => {
        const policy =
          policies.find((item) => item.action === "*") ?? policies[0];
        form.setFieldsValue(
          policy ?? {
            action: "*",
            allowedChallenges: ["POW", "CHECKBOX"],
            failMode: "CLOSED",
            immunitySeconds: 300,
            maxAttempts: 3,
            mode: "MANAGED",
            preset: "BALANCED",
            riskThreshold: null,
          },
        );
        setAssets(nextAssets);
      })
      .catch((error) => message.error(readError(error)))
      .finally(() => setLoading(false));
  }, [form, message, siteId]);

  async function savePolicy(values: Policy) {
    if (!siteId) return;
    try {
      await request("/api/management/policies", {
        body: JSON.stringify({ ...values, siteId }),
        method: "POST",
      });
      await message.success("Verification policy saved");
    } catch (error) {
      await message.error(readError(error));
    }
  }

  async function uploadAsset(values: { altText: string; name: string }) {
    const file = files[0]?.originFileObj;
    if (!siteId || !file) return message.warning("Choose an image first");
    const data = new FormData();
    data.set("siteId", siteId);
    data.set("name", values.name);
    data.set("altText", values.altText);
    data.set("file", file);
    try {
      const asset = await request<BrandAsset>("/api/management/brand-assets", {
        body: data,
        method: "POST",
      });
      setAssets((current) => [asset, ...current]);
      setFiles([]);
      await message.success("Brand image uploaded");
    } catch (error) {
      await message.error(readError(error));
    }
  }

  async function removeAsset(assetId: string) {
    try {
      await request(`/api/management/brand-assets/${assetId}`, {
        method: "DELETE",
      });
      setAssets((current) => current.filter((asset) => asset.id !== assetId));
      await message.success("Brand image disabled");
    } catch (error) {
      await message.error(readError(error));
    }
  }

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2}>
            Verification & brand challenges
          </Typography.Title>
          <Typography.Text type="secondary">
            Choose the friction policy per site and turn your own campaign
            artwork into safe orientation challenges.
          </Typography.Text>
        </div>
        <Select
          aria-label="Site"
          onChange={setSiteId}
          options={sites.map((site) => ({
            label: `${site.name} · ${site.domain}`,
            value: site.id,
          }))}
          placeholder="Select a site"
          style={{ maxWidth: 420, width: "100%" }}
          value={siteId}
        />
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={13}>
            <Card title="Default verification policy">
              <Form form={form} layout="vertical" onFinish={savePolicy}>
                <Form.Item
                  label="Preset"
                  name="preset"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={[
                      {
                        label: "Conversion · invisible first",
                        value: "CONVERSION",
                      },
                      {
                        label: "Balanced · adaptive (recommended)",
                        value: "BALANCED",
                      },
                      {
                        label: "Strict · branded visual step-up",
                        value: "STRICT",
                      },
                      { label: "Custom", value: "CUSTOM" },
                    ]}
                    onChange={(preset: keyof typeof presetDefaults) =>
                      form.setFieldsValue(presetDefaults[preset])
                    }
                  />
                </Form.Item>
                <Form.Item name="action" label="Action">
                  <Input placeholder="* or account/login" />
                </Form.Item>
                <Form.Item name="mode" label="Presentation">
                  <Select
                    options={[
                      "MANAGED",
                      "INVISIBLE",
                      "CHECKBOX",
                      "NON_INTERACTIVE",
                    ].map((value) => ({
                      label: value.replace("_", " "),
                      value,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="allowedChallenges" label="Allowed challenges">
                  <Checkbox.Group
                    options={[
                      { label: "Adaptive proof of work", value: "POW" },
                      { label: "Behavior-aware checkbox", value: "CHECKBOX" },
                      { label: "Branded visual image", value: "VISUAL" },
                    ]}
                  />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="riskThreshold" label="Risk threshold">
                      <InputNumber
                        max={100}
                        min={1}
                        placeholder="Site default"
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="maxAttempts" label="Max attempts">
                      <InputNumber max={10} min={1} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="immunitySeconds" label="Immunity (s)">
                      <InputNumber
                        max={86400}
                        min={60}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="failMode" label="Provider failure">
                  <Select
                    options={[
                      { label: "Fail closed", value: "CLOSED" },
                      { label: "Fail open", value: "OPEN" },
                    ]}
                  />
                </Form.Item>
                <Button
                  disabled={!canWrite || !siteId}
                  htmlType="submit"
                  type="primary"
                >
                  Save policy
                </Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} xl={11}>
            <Card title="Branded visual library">
              <Alert
                message="Pro, Scale or Private plan required"
                description="Upload upright PNG, JPEG or WebP artwork. TrustCaptcha rotates it into a randomized orientation task; SVG is blocked for safety."
                showIcon
                style={{ marginBottom: 16 }}
                type="info"
              />
              <Form layout="vertical" onFinish={uploadAsset}>
                <Form.Item
                  label="Internal name"
                  name="name"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Spring campaign" />
                </Form.Item>
                <Form.Item
                  label="Accessible description"
                  name="altText"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Blue product box with the TrustCaptcha mark" />
                </Form.Item>
                <Upload
                  accept="image/png,image/jpeg,image/webp"
                  beforeUpload={() => false}
                  fileList={files}
                  maxCount={1}
                  onChange={({ fileList }) => setFiles(fileList)}
                >
                  <Button disabled={!canWrite} icon={<UploadOutlined />}>
                    Choose image (max 1.5 MB)
                  </Button>
                </Upload>
                <Button
                  disabled={!canWrite || !siteId}
                  htmlType="submit"
                  style={{ marginTop: 12 }}
                  type="primary"
                >
                  Upload brand image
                </Button>
              </Form>
              <List
                dataSource={assets}
                locale={{ emptyText: "No brand images yet" }}
                renderItem={(asset) => (
                  <List.Item
                    actions={[
                      <Button
                        aria-label={`Delete ${asset.name}`}
                        danger
                        disabled={!canWrite}
                        icon={<DeleteOutlined />}
                        key="delete"
                        onClick={() => void removeAsset(asset.id)}
                        type="text"
                      />,
                    ]}
                  >
                    <List.Item.Meta
                      description={`${asset.mimeType} · ${Math.ceil(asset.byteSize / 1024)} KB`}
                      title={
                        <Space>
                          {asset.name}
                          <Tag color="blue">Active</Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                style={{ marginTop: 18 }}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </Spin>
  );
}

async function request<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok || !payload.success)
    throw new Error(payload.errorCodes?.[0] ?? "REQUEST_FAILED");
  return ("data" in payload ? payload.data : payload) as T;
}

function readError(error: unknown) {
  return error instanceof Error
    ? error.message.replaceAll("_", " ").toLowerCase()
    : "Request failed";
}
