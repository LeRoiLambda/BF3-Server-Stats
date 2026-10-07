import { LeadersSection } from "@/components/sections/leaders-section";
import {
  getServerPageScope,
  type ServerPageProps
} from "@/src/server/routing/server-pages";

export default async function ServerLeadersPage({ params, searchParams }: ServerPageProps) {
  return (
    <LeadersSection
      scope={await getServerPageScope(params)}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
