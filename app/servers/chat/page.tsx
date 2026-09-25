import { ChatSection } from "@/components/sections/chat-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersChatPage({ searchParams }: AllServersPageProps) {
  return (
    <ChatSection
      scope={await getAllServersPageScope("chat")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
