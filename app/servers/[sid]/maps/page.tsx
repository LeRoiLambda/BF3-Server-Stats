import { MapsSection } from "@/components/sections/maps-section";
import {
  getServerPageScope,
  type ServerPageProps
} from "@/src/server/routing/server-pages";

export default async function ServerMapsPage({ params, searchParams }: ServerPageProps) {
  return (
    <MapsSection
      scope={await getServerPageScope(params)}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
