import { redirect } from "next/navigation";
import { websitePath } from "@/lib/website";

export default function DocsPage() {
  redirect(websitePath("/docs"));
}
