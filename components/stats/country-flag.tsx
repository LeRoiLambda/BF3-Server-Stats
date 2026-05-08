import Image from "next/image";
import {
  countryFlagImagePath,
  formatCountryName
} from "@/src/server/domain/bf3-reference";

type CountryFlagProps = Readonly<{
  countryCode: string | null;
}>;

export function CountryFlag({ countryCode }: CountryFlagProps) {
  return (
    <Image
      src={countryFlagImagePath(countryCode)}
      alt={formatCountryName(countryCode)}
      title={formatCountryName(countryCode)}
      width={18}
      height={12}
      className="h-3 w-[18px] rounded-[2px] border border-slate-700/80 object-cover"
    />
  );
}
