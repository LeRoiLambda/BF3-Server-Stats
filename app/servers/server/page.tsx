import { ServerInfoSection } from "@/components/sections/server-info-section";
import { getAllServersPageScope } from "@/src/server/routing/server-pages";

export default async function AllServersServerInfoPage() {
  return <ServerInfoSection scope={await getAllServersPageScope("server")} />;
}
