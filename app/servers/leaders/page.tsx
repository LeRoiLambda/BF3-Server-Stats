import { LeadersSection } from "@/components/sections/leaders-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersLeadersPage({ searchParams }: AllServersPageProps) {
  const query = (await searchParams) ?? {};

  return <LeadersSection scope={await getAllServersPageScope("leaders", query)} searchParams={query} />;
}
