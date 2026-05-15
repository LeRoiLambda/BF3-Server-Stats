import Link from "next/link";
import { clsx } from "clsx";

type StatsPagerProps = Readonly<{
  page: number;
  totalPages?: number | null;
  totalLabel?: string | null;
  hasNextPage?: boolean;
  getPageHref: (page: number) => string;
}>;

type PageItem = number | "gap-start" | "gap-end";

function normalizePage(page: number): number {
  if (!Number.isFinite(page) || page <= 1) {
    return 1;
  }

  return Math.floor(page);
}

function clampPage(page: number, totalPages: number): number {
  const normalized = normalizePage(page);
  if (normalized >= totalPages) {
    return totalPages;
  }

  return normalized;
}

function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 5) {
    return [1, 2, 3, 4, 5, 6, "gap-end", totalPages];
  }

  if (page >= totalPages - 4) {
    return [
      1,
      "gap-start",
      totalPages - 5,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages
    ];
  }

  return [1, "gap-start", page - 1, page, page + 1, "gap-end", totalPages];
}

function buildOpenPageItems(page: number, hasNextPage: boolean): PageItem[] {
  const start = Math.max(1, page - 2);
  const end = page + (hasNextPage ? 2 : 0);
  const pages = Array.from(
    { length: end - start + 1 },
    (_, index) => start + index
  );

  return start > 1 ? [1, "gap-start", ...pages] : pages;
}

function pagerLinkClass(disabled = false, active = false): string {
  return clsx(
    "inline-flex h-8 min-w-8 items-center justify-center rounded-sm border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    active
      ? "border-teal-400/70 bg-teal-900/45 text-slate-50 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.2)]"
      : disabled
        ? "pointer-events-none border-slate-800/80 bg-slate-950/35 text-slate-600"
        : "border-slate-600 bg-slate-950/75 text-slate-200 hover:border-slate-400 hover:bg-slate-900 hover:text-white"
  );
}
function PagerLink({
  href,
  disabled = false,
  active = false,
  children,
  label
}: Readonly<{
  href: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}>) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={pagerLinkClass(true)}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={pagerLinkClass(false, active)}
    >
      {children}
    </Link>
  );
}

function jumpFormParts(href: string): {
  action: string;
  hiddenFields: Array<[string, string]>;
} {
  const url = new URL(href, "http://localhost");
  url.searchParams.delete("page");

  return {
    action: url.pathname,
    hiddenFields: Array.from(url.searchParams.entries())
  };
}

export function StatsPager({
  page,
  totalPages = null,
  totalLabel = null,
  hasNextPage,
  getPageHref
}: StatsPagerProps) {
  const hasKnownTotal = totalPages !== null && Number.isFinite(totalPages);
  const safeTotalPages = hasKnownTotal
    ? Math.max(1, Math.floor(totalPages))
    : null;
  const currentPage =
    safeTotalPages === null
      ? normalizePage(page)
      : clampPage(page, safeTotalPages);
  const canGoBack = currentPage > 1;
  const canGoForward =
    safeTotalPages === null
      ? Boolean(hasNextPage)
      : currentPage < safeTotalPages;
  const pageItems =
    safeTotalPages === null
      ? buildOpenPageItems(currentPage, canGoForward)
      : buildPageItems(currentPage, safeTotalPages);
  const jump = jumpFormParts(getPageHref(currentPage));

  return (
    <footer className="mt-5 border-t border-slate-700/60 pt-4 text-xs text-slate-300">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium text-slate-100">
            Page {currentPage}
            {safeTotalPages === null ? null : ` of ${safeTotalPages}`}
          </span>
          {totalLabel ? (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">{totalLabel}</span>
            </>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <nav
            aria-label="Pagination"
            className="flex min-w-0 flex-wrap items-center gap-1.5"
          >
            <PagerLink
              href={getPageHref(1)}
              disabled={!canGoBack}
              label="Go to first page"
            >
              First
            </PagerLink>
            <PagerLink
              href={getPageHref(Math.max(1, currentPage - 1))}
              disabled={!canGoBack}
              label="Go to previous page"
            >
              Prev
            </PagerLink>

            <span className="mx-1 hidden h-5 w-px bg-slate-700 sm:inline-block" />

            {pageItems.map((item) =>
              typeof item === "number" ? (
                <PagerLink
                  key={item}
                  href={getPageHref(item)}
                  active={item === currentPage}
                  label={
                    item === currentPage
                      ? `Current page, page ${item}`
                      : `Go to page ${item}`
                  }
                >
                  {item}
                </PagerLink>
              ) : (
                <span
                  key={item}
                  aria-hidden="true"
                  className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-slate-500"
                >
                  ...
                </span>
              )
            )}

            <span className="mx-1 hidden h-5 w-px bg-slate-700 sm:inline-block" />

            <PagerLink
              href={getPageHref(currentPage + 1)}
              disabled={!canGoForward}
              label="Go to next page"
            >
              Next
            </PagerLink>
            {safeTotalPages !== null ? (
              <PagerLink
                href={getPageHref(safeTotalPages)}
                disabled={!canGoForward}
                label="Go to last page"
              >
                Last
              </PagerLink>
            ) : null}
          </nav>

          <form
            action={jump.action}
            method="get"
            className="flex items-center gap-1.5"
          >
            {jump.hiddenFields.map(([name, value], index) => (
              <input
                key={`${name}-${index}`}
                type="hidden"
                name={name}
                value={value}
              />
            ))}
            <label className="sr-only" htmlFor="pagination-page">
              Go to page
            </label>
            <input
              id="pagination-page"
              type="number"
              name="page"
              min={1}
              max={safeTotalPages ?? undefined}
              defaultValue={currentPage}
              className="h-8 w-20 rounded-sm border border-slate-600 bg-slate-950/75 px-2 text-xs text-slate-100 focus:border-slate-400 focus:outline-none"
            />
            <button type="submit" className={pagerLinkClass()}>
              Go
            </button>
          </form>
        </div>
      </div>
    </footer>
  );
}
