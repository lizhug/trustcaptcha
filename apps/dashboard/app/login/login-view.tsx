"use client";

import { Card, Typography } from "antd";
import Link from "next/link";

import { LoginForm } from "./login-form";

export function LoginView() {
  return (
    <main className="auth-shell">
      <section className="auth-copy">
        <Typography.Text className="eyebrow">TrustCaptcha</Typography.Text>
        <Typography.Title>Human verification you can trust.</Typography.Title>
        <Typography.Paragraph>
          Sign in to manage sites, rotate credentials and inspect verification
          traffic.
        </Typography.Paragraph>
      </section>
      <Card className="auth-card" title="Sign in to your workspace">
        <LoginForm />
        <Typography.Paragraph className="auth-switch">
          New to TrustCaptcha? <Link href="/register">Create an account</Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
}
