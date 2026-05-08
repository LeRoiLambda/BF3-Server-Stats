import { notFound } from "next/navigation";
import { isServerSection } from "@/src/server/routing/sections";

type ServerSectionFallbackPageProps = {
  params: Promise<{ sid: string; section: string }>;
};

export default async function ServerSectionFallbackPage({
  params
}: ServerSectionFallbackPageProps) {
  const { section } = await params;

  if (!isServerSection(section) || section === "home") {
    notFound();
  }

  // Concrete section pages are implemented as dedicated routes.
  // This dynamic route exists only as a hard fallback.
  notFound();
}

