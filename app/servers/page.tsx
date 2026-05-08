import { redirect } from "next/navigation";
import { getLegacyServerContext } from "@/src/server/repositories/server-repository";

export const revalidate = 30;

export default async function ServersPage() {
  const context = await getLegacyServerContext();

  if (context.servers.length === 1) {
    redirect(`/servers/${context.servers[0].serverId}`);
  }

  if (context.servers.length > 1) {
    redirect(`/servers/${context.servers[0].serverId}`);
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
