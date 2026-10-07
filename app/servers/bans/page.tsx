import { BansSection } from "@/components/sections/bans-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersBansPage({ searchParams }: AllServersPageProps) {
  const query = (await searchParams) ?? {};

  return <BansSection scope={await getAllServersPageScope("bans", query)} searchParams={query} />;
}
