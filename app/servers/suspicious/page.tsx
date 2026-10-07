import { SuspiciousSection } from "@/components/sections/suspicious-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersSuspiciousPage({ searchParams }: AllServersPageProps) {
  const query = (await searchParams) ?? {};

  return <SuspiciousSection scope={await getAllServersPageScope("suspicious", query)} searchParams={query} />;
}
