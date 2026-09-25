import { ServerInfoSection } from "@/components/sections/server-info-section";
import {
  getServerPageScope,
  type ServerPageProps
} from "@/src/server/routing/server-pages";

export default async function ServerInfoPage({ params }: ServerPageProps) {
  return <ServerInfoSection scope={await getServerPageScope(params)} />;
}
