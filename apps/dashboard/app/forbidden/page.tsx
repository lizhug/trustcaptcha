import { Button, Result } from "antd";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <Result
      extra={
        <Button type="primary">
          <Link href="/">Back to dashboard</Link>
        </Button>
      }
      status="403"
      subTitle="Your current tenant role does not allow this action."
      title="Access denied"
    />
  );
}
