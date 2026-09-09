import { redirect } from "next/navigation";

export default function SetupIosPage() {
  redirect("/dashboard/installation?platform=ios");
}
