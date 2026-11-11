import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: { reset?: string } }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthForm mode="login" action={loginAction} notice={searchParams.reset ? "Password changed. Log in with your new password." : undefined} />;
}
