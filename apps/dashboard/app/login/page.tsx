import { redirect } from "next/navigation";

import { auth } from "../../auth";
import { LoginView } from "./login-view";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user.id && session.activeCustomer) {
    redirect("/");
  }

  return <LoginView />;
}
