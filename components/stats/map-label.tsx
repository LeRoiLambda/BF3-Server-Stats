import Image from "next/image";
import {
  formatMapName,
  mapImagePath
} from "@/src/server/domain/bf3-reference";

type MapLabelProps = Readonly<{
  mapCode: string | null;
}>;

export function MapLabel({ mapCode }: MapLabelProps) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={mapImagePath(mapCode)}
        alt={formatMapName(mapCode)}
        width={64}
        height={36}
        className="h-8 w-14 rounded-sm border border-slate-700/70 object-cover"
      />
      <span>{formatMapName(mapCode)}</span>
    </div>
  );
}
