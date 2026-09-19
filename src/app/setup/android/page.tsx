import { redirect } from "next/navigation";

export default function AndroidSetupPage() {
  redirect("/dashboard?setup=1");
}
