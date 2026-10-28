import type { Metadata } from "next";
import { LibraryEditor } from "@/components/materials/LibraryEditor";
import { loadLibrary } from "@/lib/materialsStore";
import { getLang, requireAdmin } from "../../../_server/session";
import { AdminNav } from "../AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "材料库 Material library · 包装视觉顾问 Packaging Advisor" };

/** The material library: the principal's list with this deployment's edits, all editable. */
export default async function MaterialsAdminPage() {
  await requireAdmin();
  const lang = await getLang();
  const lib = loadLibrary();
  return (
    <main className="page admin-grid">
      <div className="page-head">
        <h1>材料库 Material library</h1>
        <AdminNav current="materials" />
      </div>
      <LibraryEditor initial={lib} lang={lang} saveUrl="/api/materials" />
    </main>
  );
}
