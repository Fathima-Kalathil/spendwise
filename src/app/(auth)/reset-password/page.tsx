import { redirect } from "next/navigation";
import { ResetForm } from "@/components/ResetForm";

export default function ResetPasswordPage({ searchParams }: { searchParams: { email?: string } }) {
  const email = searchParams.email?.trim().toLowerCase();
  if (!email) redirect("/forgot-password");
  return <ResetForm email={email} />;
}
