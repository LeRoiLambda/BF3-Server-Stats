import Link from "next/link";
import { navButtonClass, ui } from "@/components/layout/stats-ui";
import { LinkMenu } from "@/components/layout/link-menu";
import { PlayerProfileSearchForm } from "@/components/search/player-profile-search-form";
import {
  SERVER_NAV_SECTIONS,
  sectionLabel,
  type ServerSection,
} from "@/src/server/routing/sections";
import { readEnv } from "@/src/server/env";
import { allServersHref, serverSectionHref } from "@/src/server/routing/server-pages";
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
  titleAction?: React.ReactNode;
  children: React.ReactNode;
}>;

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
  titleAction,
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
  const sectionHref = (section: ServerSection) =>
    hasServerScope ? serverSectionHref(currentServerId, section) : allServersHref(section);
  const defaultScopeOptions = [
    ...servers.map((server) => ({
      label: server.serverName,
      href: serverSectionHref(server.serverId, activeSection),
    })),
    {
      label: "All Servers",
      href: allServersHref(activeSection),
    },
  ];
  const effectiveScopeOptions = scopeOptions ?? defaultScopeOptions;
  const effectiveScopeValue = scopeValue ?? sectionHref(activeSection);
  const hasScopeSelect = scopeOptions
    ? effectiveScopeOptions.length > 1
    : hasMultipleServers;
  const bannerImage = readEnv().BF3_STATS_BANNER_IMAGE;
  const sections: ServerSection[] = ["home", ...SERVER_NAV_SECTIONS];

  return (
    <main className={ui.pageContainer}>
      <header className="stats-panel overflow-visible">
        <div className="border-b border-slate-600/35 bg-slate-950/90 px-3 py-4 sm:rounded-t-sm sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link href={sectionHref("home")} className="inline-flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerImage}
                  alt="Battlefield 3"
                  className="h-9 w-auto sm:h-10"
                  width={240}
                  height={54}
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
            {battlelogHref || hasScopeSelect || titleAction ? (
              <div className="flex w-full shrink-0 flex-nowrap items-center justify-end gap-2 sm:w-auto">
                {hasScopeSelect ? (
                  <LinkMenu
                    label="Server"
                    align="end"
                    items={effectiveScopeOptions.map((option) => ({
                      ...option,
                      current: option.href === effectiveScopeValue
                    }))}
                    className="min-w-0 flex-1 sm:w-56 sm:flex-none"
                  />
                ) : null}
                {titleAction}
                {battlelogHref ? (
                  <a
                    href={battlelogHref}
                    target="_blank"
                    rel="noreferrer"
                    className={`${ui.buttonPrimary} text-nowrap`}
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

        <section className="bg-slate-950/70 px-3 py-3 sm:rounded-b-sm sm:px-6">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <nav aria-label="Sections" className="hidden min-w-0 flex-wrap gap-1.5 sm:flex xl:flex-nowrap">
              {sections.map((section) => (
                <Link
                  key={section}
                  href={sectionHref(section)}
                  className={navButtonClass(activeSection === section)}
                >
                  {sectionLabel(section)}
                </Link>
              ))}
            </nav>

            <div className="flex min-w-0 items-center gap-2 sm:justify-end xl:shrink-0">
              <LinkMenu
                label="Section"
                items={sections.map((section) => ({
                  label: sectionLabel(section),
                  href: sectionHref(section),
                  current: section === activeSection
                }))}
                className="w-32 shrink-0 sm:hidden"
              />
              <PlayerProfileSearchForm
                serverId={currentServerId}
                inputClassName={ui.input}
                inputWrapperClassName="flex-1 sm:w-64 sm:flex-none xl:w-52"
                buttonClassName={`${ui.buttonPrimary} shrink-0`}
              />
            </div>
          </div>
        </section>
      </header>

      <section className="mt-6">{children}</section>
    </main>
  );
}
