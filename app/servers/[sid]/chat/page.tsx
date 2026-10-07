import { ChatSection } from "@/components/sections/chat-section";
import {
  getServerPageScope,
  type ServerPageProps
} from "@/src/server/routing/server-pages";

export default async function ServerChatPage({ params, searchParams }: ServerPageProps) {
  return (
    <ChatSection
      scope={await getServerPageScope(params)}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
