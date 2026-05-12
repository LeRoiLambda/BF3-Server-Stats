import Image from "next/image";
import {
  formatMapName,
  mapImagePath
} from "@/src/server/domain/bf3-reference";

type MapLabelProps = Readonly<{
  mapCode: string | null;
}>;

export function MapLabel({ mapCode }: MapLabelProps) {
  const imagePath = mapImagePath(mapCode);

  return (
    <div className="flex items-center gap-3">
      {imagePath ? (
        <Image
          src={imagePath}
          alt={formatMapName(mapCode)}
          width={120}
          height={20}
          className="h-5 w-[120px] rounded-sm border border-slate-700/70 object-cover"
        />
      ) : null}
      <span>{formatMapName(mapCode)}</span>
    </div>
  );
}
