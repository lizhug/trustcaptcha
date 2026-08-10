"use client";

import { Button, Form, Input, Typography } from "antd";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  async function handleSubmit(values: LoginFormValues) {
    setError(undefined);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email or password is incorrect, or this account is suspended.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <Form<LoginFormValues>
      layout="vertical"
      name="trustcaptcha-login"
      onFinish={handleSubmit}
      requiredMark={false}
      size="large"
    >
      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: "Enter your email address" },
          { type: "email", message: "Enter a valid email address" },
        ]}
      >
        <Input autoComplete="email" placeholder="you@company.com" />
      </Form.Item>
      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: "Enter your password" }]}
      >
        <Input.Password
          autoComplete="current-password"
          placeholder="Password"
        />
      </Form.Item>
      {error ? (
        <Typography.Paragraph role="alert" type="danger">
          {error}
        </Typography.Paragraph>
      ) : null}
      <Button block htmlType="submit" type="primary">
        Sign in
      </Button>
    </Form>
  );
}
