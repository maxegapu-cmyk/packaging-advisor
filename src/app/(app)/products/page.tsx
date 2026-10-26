import Link from "next/link";
import { Bi, T } from "@/components/Bi";
import { ProductList } from "@/components/ProductList";
import { UI } from "@/lib/i18n";
import { listProjects } from "@/lib/projects";
import { getLang, requireInvite } from "../../_server/session";

export default async function ProductsPage() {
  const invite = await requireInvite();
  const lang = await getLang();
  const projects = listProjects(invite.id);
  return (
    <main className="page">
      <div className="page-head">
        <T k="myProducts" lang={lang} as="h1" />
        {projects.length ? (
          <Link href="/new" className="btn btn-primary">
            <Bi p={UI.newProduct} lang={lang} />
          </Link>
        ) : null}
      </div>
      <ProductList
        lang={lang}
        items={projects.map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          itemType: p.itemType,
          brand: p.brand,
          createdAt: p.createdAt,
          boardCount: p.boardCount,
          picked: p.picked,
          handedOff: p.handedOff,
          thumbUrl: p.thumbId ? `/api/uploads/${p.thumbId}` : null,
        }))}
      />
    </main>
  );
}
