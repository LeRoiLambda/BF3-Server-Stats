import Link from "next/link";
import { clsx } from "clsx";

type StatsPagerProps = Readonly<{
  page: number;
  totalPages: number;
  totalLabel: string;
  getPageHref: (page: number) => string;
}>;

type PageItem = number | "gap-start" | "gap-end";

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page) || page <= 1) {
    return 1;
  }

  if (page >= totalPages) {
    return totalPages;
  }

  return Math.floor(page);
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

export function StatsPager({
  page,
  totalPages,
  totalLabel,
  getPageHref
}: StatsPagerProps) {
  const safeTotalPages = Math.max(1, Math.floor(totalPages));
  const currentPage = clampPage(page, safeTotalPages);
  const pageItems = buildPageItems(currentPage, safeTotalPages);
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < safeTotalPages;

  return (
    <footer className="mt-5 border-t border-slate-700/60 pt-4 text-xs text-slate-300">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium text-slate-100">
            Page {currentPage} of {safeTotalPages}
          </span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{totalLabel}</span>
        </div>

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
            href={getPageHref(Math.min(safeTotalPages, currentPage + 1))}
            disabled={!canGoForward}
            label="Go to next page"
          >
            Next
          </PagerLink>
          <PagerLink
            href={getPageHref(safeTotalPages)}
            disabled={!canGoForward}
            label="Go to last page"
          >
            Last
          </PagerLink>
        </nav>
      </div>
    </footer>
  );
}
