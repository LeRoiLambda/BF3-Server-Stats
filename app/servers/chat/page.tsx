import { ChatSection } from "@/components/sections/chat-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersChatPage({ searchParams }: AllServersPageProps) {
  const query = (await searchParams) ?? {};

  return <ChatSection scope={await getAllServersPageScope("chat", query)} searchParams={query} />;
}
