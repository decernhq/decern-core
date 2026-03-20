import { redirect } from "next/navigation";
import { websitePath } from "@/lib/website";

export default function PricingPage() {
  redirect(websitePath("/pricing"));
}
