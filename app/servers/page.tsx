import { redirect } from "next/navigation";
import { getServerContext } from "@/src/server/repositories/server-repository";
import { allServersHref, serverSectionHref } from "@/src/server/routing/server-pages";

export default async function ServersPage() {
  const context = await getServerContext();

  if (context.servers.length === 1) {
    redirect(serverSectionHref(context.servers[0].serverId, "home"));
  }

  if (context.servers.length > 1) {
    redirect(allServersHref("home"));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <section className="rounded-sm border border-rose-300/45 bg-rose-950/50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200">
          No Servers
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-rose-100">
          No active BF3 servers were found
        </h1>
        <p className="mt-3 text-sm leading-6 text-rose-100/90">
          Add an active BF3 server to the stats database before opening the stats pages.
        </p>
      </section>
    </main>
  );
}
