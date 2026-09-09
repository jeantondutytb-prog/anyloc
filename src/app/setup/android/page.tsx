import { redirect } from "next/navigation";

export default function SetupAndroidPage() {
  redirect("/dashboard/installation?platform=android");
}
