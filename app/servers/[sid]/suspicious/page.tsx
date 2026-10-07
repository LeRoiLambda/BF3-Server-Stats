import { SuspiciousSection } from "@/components/sections/suspicious-section";
import {
  getServerPageScope,
  type ServerPageProps
} from "@/src/server/routing/server-pages";

export default async function ServerSuspiciousPage({ params, searchParams }: ServerPageProps) {
  return (
    <SuspiciousSection
      scope={await getServerPageScope(params)}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
