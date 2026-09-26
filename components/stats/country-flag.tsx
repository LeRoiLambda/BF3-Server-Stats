import Image from "next/image";
import { Hint } from "@/components/layout/hint";
import {
  countryFlagImagePath,
  formatCountryName
} from "@/src/server/domain/bf3-reference";

type CountryFlagProps = Readonly<{
  countryCode: string | null;
  decorative?: boolean;
}>;

export function CountryFlag({ countryCode, decorative = false }: CountryFlagProps) {
  const name = formatCountryName(countryCode);
  const flag = (
    <Image
      src={countryFlagImagePath(countryCode)}
      alt={decorative ? "" : name}
      width={18}
      height={12}
      className="h-3 w-[18px] rounded-[2px] border border-slate-700/80 object-cover"
    />
  );

  return decorative ? (
    flag
  ) : (
    <Hint label={name} className="inline-flex">
      {flag}
    </Hint>
  );
}
