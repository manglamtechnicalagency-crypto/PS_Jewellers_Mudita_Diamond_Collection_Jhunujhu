import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/lib/admin-auth";
import ProductEditorPage from "../page";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error === "unauthorized" || auth.error === "mfa_required") redirect("/admin/login");
  return <ProductEditorPage params={params} />;
}
