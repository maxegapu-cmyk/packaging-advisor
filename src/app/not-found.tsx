import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page page-narrow" style={{ minHeight: "80vh", display: "grid", alignContent: "center", gap: 20 }}>
      <h1 style={{ fontSize: 40 }}>找不到这个页面</h1>
      <p>链接可能已停用或输入有误。 This page isn&apos;t available; the link may have been turned off.</p>
      <div>
        <Link href="/" className="btn">
          返回首页 Back to home
        </Link>
      </div>
    </main>
  );
}
