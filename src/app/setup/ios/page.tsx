import { redirect } from "next/navigation";

export default function IosSetupPage() {
  redirect("/dashboard?setup=1");
}
