import { SuspiciousSection } from "@/components/sections/suspicious-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersSuspiciousPage({ searchParams }: AllServersPageProps) {
  return (
    <SuspiciousSection
      scope={await getAllServersPageScope("suspicious")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
