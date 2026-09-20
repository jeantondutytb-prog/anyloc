import { redirect } from "next/navigation";

export default function SetupAndroidPage() {
  redirect("/dashboard?platform=android");
}
