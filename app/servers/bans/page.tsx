import { BansSection } from "@/components/sections/bans-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersBansPage({ searchParams }: AllServersPageProps) {
  return (
    <BansSection
      scope={await getAllServersPageScope("bans")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
