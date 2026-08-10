import { redirect } from "next/navigation";

import { auth } from "../../auth";
import { RegisterView } from "./register-view";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user.id && session.activeCustomer) redirect("/");

  return (
    <RegisterView
      apiBaseUrl={process.env.PUBLIC_API_URL ?? ""}
      siteKey={process.env.SIGNUP_SITE_KEY ?? ""}
    />
  );
}
