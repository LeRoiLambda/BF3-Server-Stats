import { BansSection } from "@/components/sections/bans-section";
import {
  getServerPageScope,
  type ServerPageProps
} from "@/src/server/routing/server-pages";

export default async function ServerBansPage({ params, searchParams }: ServerPageProps) {
  return (
    <BansSection
      scope={await getServerPageScope(params)}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
