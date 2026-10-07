import { CountriesSection } from "@/components/sections/countries-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersCountriesPage({ searchParams }: AllServersPageProps) {
  return (
    <CountriesSection
      scope={await getAllServersPageScope("countries")}
      searchParams={(await searchParams) ?? {}}
    />
  );
}
