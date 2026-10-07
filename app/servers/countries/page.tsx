import { CountriesSection } from "@/components/sections/countries-section";
import {
  getAllServersPageScope,
  type AllServersPageProps
} from "@/src/server/routing/server-pages";

export default async function AllServersCountriesPage({ searchParams }: AllServersPageProps) {
  const query = (await searchParams) ?? {};

  return <CountriesSection scope={await getAllServersPageScope("countries", query)} searchParams={query} />;
}
