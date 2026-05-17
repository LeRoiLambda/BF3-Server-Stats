import Image from "next/image";
import { StatsShell } from "@/components/layout/stats-shell";
import { ui } from "@/components/layout/stats-ui";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";

export default async function NotFound() {
  const context = await getLegacyServerContext();

  return (
    <StatsShell
      title="Page Not Found"
      subtitle="Use the navigation or player search to get back to live stats."
      servers={context.servers}
      activeSection="home"
    >
      <section className="stats-panel min-w-0 rounded-sm p-0">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 p-5 sm:p-6">
            <p className={ui.sectionTitle}>404</p>
            <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight text-slate-50 sm:text-3xl">
              Nothing to show here.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              This address may be old, mistyped, or outside the tracked BF3 stats.
            </p>
          </div>

          <div className="relative min-h-[180px] overflow-hidden rounded-b-sm border-t border-slate-700/55 bg-slate-900 lg:rounded-bl-none lg:rounded-r-sm lg:border-l lg:border-t-0">
            <Image
              src="/images/maps/mp_subway.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 320px, 100vw"
              className="object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/25 to-slate-950/55 lg:bg-gradient-to-t" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Lost Address
              </p>
              <p className="mt-1 text-sm text-slate-200">
                Open a live server or search for a player.
              </p>
            </div>
          </div>
        </div>
      </section>
    </StatsShell>
  );
}
