import Image from "next/image";
import Link from "next/link";
import { navButtonClass, ui } from "@/components/layout/stats-ui";
import { ServerScopeSelect } from "@/components/layout/server-scope-select";
import { PlayerProfileSearchForm } from "@/components/search/player-profile-search-form";
import {
  SERVER_NAV_SECTIONS,
  sectionLabel,
  type ServerSection,
} from "@/src/server/routing/sections";
import type { ActiveServer } from "@/src/server/repositories/server-repository";

type ScopeOption = {
  label: string;
  href: string;
};

type StatsShellProps = Readonly<{
  title: string;
  subtitle?: string;
  servers: ActiveServer[];
  currentServerId?: number | null;
  activeSection: ServerSection;
  scopeOptions?: ScopeOption[];
  scopeValue?: string;
  children: React.ReactNode;
}>;

function sectionHref(serverId: number, section: ServerSection): string {
  if (section === "home") {
    return `/servers/${serverId}`;
  }

  return `/servers/${serverId}/${section}`;
}

function allServersSectionHref(section: ServerSection): string {
  return `/servers/${section}`;
}

function battlelogServerSearchHref(serverName: string): string {
  const params = new URLSearchParams({
    filtered: "1",
    expand: "0",
    useAdvanced: "1",
    q: serverName,
  });

  return `https://battlelog.battlefield.com/bf3/servers/pc/?${params.toString()}`;
}

export function StatsShell({
  title,
  subtitle,
  servers,
  currentServerId = null,
  activeSection,
  scopeOptions,
  scopeValue,
  children,
}: StatsShellProps) {
  const hasServerScope = currentServerId !== null;
  const hasMultipleServers = servers.length > 1;
  const currentServer = hasServerScope
    ? (servers.find((server) => server.serverId === currentServerId) ?? null)
    : null;
  const battlelogHref = currentServer
    ? battlelogServerSearchHref(currentServer.serverName)
    : null;
  const scopeSection = activeSection;
  const allServersHref = allServersSectionHref(scopeSection);
  const selectedScopeHref = hasServerScope
    ? sectionHref(currentServerId, scopeSection)
    : allServersHref;
  const defaultScopeOptions = [
    ...servers.map((server) => ({
      label: server.serverName,
      href: sectionHref(server.serverId, scopeSection),
    })),
    {
      label: "All Servers",
      href: allServersHref,
    },
  ];
  const effectiveScopeOptions = scopeOptions ?? defaultScopeOptions;
  const effectiveScopeValue = scopeValue ?? selectedScopeHref;
  const hasScopeSelect = scopeOptions ? effectiveScopeOptions.length > 1 : hasMultipleServers;

  return (
    <main className={ui.pageContainer}>
      <header className="stats-panel overflow-visible rounded-sm">
        <div className="rounded-t-sm border-b border-slate-600/35 bg-slate-950/90 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link href="/servers" className="inline-flex">
                <Image
                  src="/images/bf3-logo.png"
                  alt="Battlefield 3"
                  className="h-9 w-auto sm:h-10"
                  width={240}
                  height={54}
                  priority
                />
              </Link>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  BF3 Server Stats
                </p>
                <h1 className="mt-1 break-words text-xl font-semibold text-slate-50 sm:text-2xl">
                  {title}
                </h1>
              </div>
            </div>
            {battlelogHref || hasScopeSelect ? (
              <div className="flex w-full shrink-0 flex-nowrap items-center justify-end gap-2 sm:w-auto">
                {hasScopeSelect ? (
                  <ServerScopeSelect
                    value={effectiveScopeValue}
                    options={effectiveScopeOptions}
                    className={`${ui.input} h-9 min-w-0 w-56 max-w-full`}
                  />
                ) : null}
                {battlelogHref ? (
                  <a
                    href={battlelogHref}
                    target="_blank"
                    rel="noreferrer"
                    className={`${ui.buttonPrimary} inline-flex h-9 items-center text-nowrap`}
                  >
                    Join Server
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              {subtitle}
            </p>
          ) : null}
        </div>

        <section className="rounded-b-sm bg-slate-950/70 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <nav className="flex min-w-0 flex-wrap gap-2">
              <Link
                href={
                  hasServerScope
                    ? sectionHref(currentServerId, "home")
                    : allServersSectionHref("home")
                }
                className={navButtonClass(activeSection === "home")}
              >
                Home
              </Link>
              {SERVER_NAV_SECTIONS.map((section) => {
                const href = hasServerScope
                  ? sectionHref(currentServerId, section)
                  : allServersSectionHref(section);

                return (
                  <Link
                    key={section}
                    href={href}
                    className={navButtonClass(activeSection === section)}
                  >
                    {sectionLabel(section)}
                  </Link>
                );
              })}
            </nav>

            <PlayerProfileSearchForm
              serverId={currentServerId}
              inputClassName={`${ui.input} h-8`}
              inputWrapperClassName="flex-1 lg:w-64"
              buttonClassName={`${ui.buttonPrimary} shrink-0`}
            />
          </div>
        </section>
      </header>

      <section className="mt-6">{children}</section>
    </main>
  );
}
