import Link from "next/link";

/** Previous / numbers / Next. On phones only "Page X of Y" is shown between the two buttons. */
export function Pagination({ page, totalPages, params }: { page: number; totalPages: number; params: Record<string, string | undefined> }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/transactions${s ? `?${s}` : ""}`;
  };
  const nums = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);
  const off = "pointer-events-none opacity-40";

  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-2 border-t pt-4" style={{ borderColor: "var(--line)" }}>
      <Link href={href(page - 1)} aria-disabled={page === 1} className={`btn ${page === 1 ? off : ""}`}>‹ Previous</Link>
      <span className="muted text-sm sm:hidden">Page {page} of {totalPages}</span>
      <div className="hidden items-center gap-2 sm:flex">
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-2">
            {i > 0 && n - nums[i - 1] > 1 && <span className="muted">…</span>}
            <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={`chip ${n === page ? "chip-on" : ""}`}>{n}</Link>
          </span>
        ))}
      </div>
      <Link href={href(page + 1)} aria-disabled={page === totalPages} className={`btn ${page === totalPages ? off : ""}`}>Next ›</Link>
    </nav>
  );
}
