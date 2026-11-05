import { requireUser } from "@/lib/auth";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Settings</h1><SettingsForm name={user.name} email={user.email} base={user.baseCurrency.trim()} /></div>);
}
