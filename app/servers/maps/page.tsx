import { MapsSection } from "@/components/sections/maps-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersMapsPage({ searchParams }: AllServersPageProps) {
  const query = (await searchParams) ?? {};

  return <MapsSection scope={await getAllServersPageScope("maps", query)} searchParams={query} />;
}
