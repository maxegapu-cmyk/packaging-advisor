import Link from "next/link";
import { Bi, T } from "@/components/Bi";
import { CATEGORIES } from "@/lib/categories";
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
        <Link href="/new" className="btn btn-primary">
          <T k="newProduct" lang={lang} />
        </Link>
      </div>
      {projects.length === 0 ? (
        <div className="empty">
          <T k="noProducts" lang={lang} as="p" />
          <Link href="/new" className="btn btn-primary">
            <T k="newProduct" lang={lang} />
          </Link>
        </div>
      ) : (
        <div className="products">
          {projects.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className="product-row">
              <div>
                <h2>{p.title}</h2>
                <p className="product-meta">
                  <Bi p={CATEGORIES[p.category]} lang={lang} className="tag" />
                  {p.brand ? <span>{p.brand}</span> : null}
                  <span>{new Date(p.createdAt).toLocaleDateString("zh-CN")}</span>
                </p>
              </div>
              <div className="product-meta">
                {p.picked ? (
                  <span className="tag tag-ink">
                    <T k="picked" lang={lang} /> {p.picked}
                  </span>
                ) : null}
                {p.boardCount ? (
                  <span>
                    <T k="version" lang={lang} /> {p.boardCount}
                  </span>
                ) : (
                  <T k="noBoardYet" lang={lang} />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
