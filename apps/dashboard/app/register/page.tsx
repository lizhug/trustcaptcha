import { redirect } from "next/navigation";

import { auth } from "../../auth";
import { RegisterView } from "./register-view";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user.id && session.activeCustomer) redirect("/");

  return (
    <RegisterView
      apiBaseUrl={process.env.NEXT_PUBLIC_API_URL ?? ""}
      siteKey={process.env.NEXT_PUBLIC_SIGNUP_SITE_KEY ?? ""}
    />
  );
}
