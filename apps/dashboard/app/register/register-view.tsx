"use client";

import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { signIn } from "next-auth/react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type RegisterValues = {
  companyName: string;
  confirmPassword: string;
  email: string;
  name: string;
  password: string;
  website?: string;
};

type WidgetHandle = { destroy(): void; reset(): Promise<void> };
type TrustCaptchaApi = {
  render(options: {
    action: string;
    apiBaseUrl: string;
    callback(token: string): void;
    element: string;
    errorCallback(error: { code: string }): void;
    language: "auto";
    mode: "managed";
    siteKey: string;
  }): WidgetHandle;
};

export function RegisterView({
  apiBaseUrl,
  siteKey,
}: {
  apiBaseUrl: string;
  siteKey: string;
}) {
  const router = useRouter();
  const widget = useRef<WidgetHandle | undefined>(undefined);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [error, setError] = useState<string>();
  const [sdkReady, setSdkReady] = useState(false);
  const configured = Boolean(apiBaseUrl && siteKey);

  const mountWidget = useCallback(() => {
    const api = (window as typeof window & { TrustCaptcha?: TrustCaptchaApi })
      .TrustCaptcha;
    if (!configured || !sdkReady || !api || widget.current) return;
    widget.current = api.render({
      action: "account/register",
      apiBaseUrl,
      callback: setCaptchaToken,
      element: "#signup-captcha",
      errorCallback: (widgetError) => setError(widgetError.code),
      language: "auto",
      mode: "managed",
      siteKey,
    });
  }, [apiBaseUrl, configured, sdkReady, siteKey]);

  useEffect(() => mountWidget(), [mountWidget]);
  useEffect(
    () => () => {
      widget.current?.destroy();
      widget.current = undefined;
    },
    [],
  );

  async function handleSubmit(values: RegisterValues) {
    setError(undefined);
    if (!captchaToken) {
      setError("Complete the human verification first.");
      return;
    }

    const response = await fetch("/api/register", {
      body: JSON.stringify({
        captchaToken,
        companyName: values.companyName,
        email: values.email,
        name: values.name,
        password: values.password,
        website: values.website ?? "",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json()) as { errorCodes?: string[] };
    if (!response.ok) {
      setError(readRegistrationError(payload.errorCodes?.[0]));
      setCaptchaToken(undefined);
      await widget.current?.reset();
      return;
    }

    const login = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (login?.error) {
      router.replace("/login?registered=1");
      return;
    }
    router.replace("/sites?onboarding=1");
    router.refresh();
  }

  return (
    <main className="auth-shell register-shell">
      <section className="auth-copy">
        <Typography.Text className="eyebrow">Start free</Typography.Text>
        <Typography.Title>Protect your first site in minutes.</Typography.Title>
        <Typography.Paragraph>
          Create a workspace, add your domain and copy the integration code. No
          payment method is required for the Free plan.
        </Typography.Paragraph>
      </section>
      <Card className="auth-card" title="Create your TrustCaptcha workspace">
        {!configured ? (
          <Alert
            showIcon
            type="warning"
            message="Self-service signup is not configured on this deployment."
          />
        ) : null}
        <Form<RegisterValues>
          layout="vertical"
          name="trustcaptcha-register"
          onFinish={handleSubmit}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            label="Your name"
            name="name"
            rules={[{ required: true }, { min: 2, max: 120 }]}
          >
            <Input autoComplete="name" placeholder="Alex Chen" />
          </Form.Item>
          <Form.Item
            label="Company or project"
            name="companyName"
            rules={[{ required: true }, { min: 2, max: 160 }]}
          >
            <Input autoComplete="organization" placeholder="Acme" />
          </Form.Item>
          <Form.Item
            label="Work email"
            name="email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input autoComplete="email" placeholder="you@company.com" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true },
              { min: 12, message: "Use at least 12 characters" },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                message: "Include a letter and a number",
              },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            dependencies={["password"]}
            label="Confirm password"
            name="confirmPassword"
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            className="signup-honeypot"
            name="website"
            aria-hidden="true"
          >
            <Input autoComplete="off" tabIndex={-1} />
          </Form.Item>
          <div id="signup-captcha" className="signup-captcha" />
          {error ? (
            <Typography.Paragraph role="alert" type="danger">
              {error}
            </Typography.Paragraph>
          ) : null}
          <Button
            block
            disabled={!configured || !captchaToken}
            htmlType="submit"
            type="primary"
          >
            Create free workspace
          </Button>
        </Form>
        <Typography.Paragraph className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </Typography.Paragraph>
        {configured ? (
          <Script
            async
            data-api-base={apiBaseUrl}
            defer
            src={`${apiBaseUrl.replace(/\/$/, "")}/trustcaptcha.js`}
            strategy="afterInteractive"
            onReady={() => setSdkReady(true)}
          />
        ) : null}
      </Card>
    </main>
  );
}

function readRegistrationError(code?: string) {
  const messages: Record<string, string> = {
    ACCOUNT_EXISTS: "An account with this email already exists.",
    CAPTCHA_FAILED: "Verification expired or was rejected. Please retry.",
    INVALID_INPUT: "Review the form and try again.",
    SIGNUP_NOT_CONFIGURED: "Signup is temporarily unavailable.",
    UPSTREAM_UNAVAILABLE: "Verification is temporarily unavailable.",
  };
  return messages[code ?? ""] ?? "Unable to create the account right now.";
}
