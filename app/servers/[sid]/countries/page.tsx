import { CountriesSection } from "@/components/sections/countries-section";
import {
  getServerPageScope,
  type ServerPageProps
} from "@/src/server/routing/server-pages";

export default async function ServerCountriesPage({ params, searchParams }: ServerPageProps) {
  return (
    <CountriesSection
      scope={await getServerPageScope(params)}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
