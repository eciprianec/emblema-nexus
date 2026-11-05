import Link from "next/link";

/** Paginación por enlaces, para pantallas del servidor que filtran por la URL. */
export function Pager({
  path,
  params,
  page,
  pageSize,
  total,
}: {
  path: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    query.set("pagina", String(target));
    return `${path}?${query.toString()}`;
  };

  const linkClass = "rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50";

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-xs text-slate-600">
      <span>
        Página {page} de {pages} · {total} en total
      </span>
      <span className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className={linkClass}>
            Anterior
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className={linkClass}>
            Siguiente
          </Link>
        )}
      </span>
    </nav>
  );
}

export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
