import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/VerifyForm";

export default function VerifyPage({ searchParams }: { searchParams: { email?: string } }) {
  const email = searchParams.email?.trim().toLowerCase();
  if (!email) redirect("/register");
  return <VerifyForm email={email} />;
}
