import { redirect } from "next/navigation";

// Root page: redirect to the landing page in the (marketing) route group
export default function RootPage() {
  redirect("/home");
}
