"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { clsx } from "clsx";
import {
  formatGamemodeName,
  formatMapName,
  mapImagePath
} from "@/src/server/domain/bf3-reference";
import type { MapRotationEntry } from "@/src/server/repositories/map-rotation-repository";

type MapRotationCarouselProps = {
  rotation: MapRotationEntry[];
  currentMapCode: string | null;
  currentGamemode: string | null;
  usedSlots: number;
  maxSlots: number;
  refreshLabel?: string;
};

type CarouselEntry = {
  mapCode: string | null;
  gamemode: string | null;
  mapIndex: number | null;
  rounds: number | null;
  currentRound: number | null;
  totalRounds: number | null;
  updatedAt: string | null;
};

type RotationContext = {
  current: CarouselEntry;
  entries: MapRotationEntry[];
  liveIndex: number;
  selectedIndex: number;
};

function entryFromRotation(entry: MapRotationEntry): CarouselEntry {
  return {
    mapCode: entry.mapCode,
    gamemode: entry.gamemode,
    mapIndex: entry.mapIndex,
    rounds: entry.rounds,
    currentRound: entry.currentRound,
    totalRounds: entry.totalRounds,
    updatedAt: entry.updatedAt
  };
}

function fallbackEntry(
  mapCode: string | null,
  gamemode: string | null,
  updatedAt: string | null = null
): CarouselEntry {
  return {
    mapCode,
    gamemode,
    mapIndex: null,
    rounds: null,
    currentRound: null,
    totalRounds: null,
    updatedAt
  };
}

function buildRotationContext(
  rotation: MapRotationEntry[],
  currentMapCode: string | null,
  currentGamemode: string | null,
  selectedIndex: number
): RotationContext {
  const entries = rotation.slice().sort((left, right) => left.mapIndex - right.mapIndex);
  const flaggedCurrentIndex = entries.findIndex((entry) => entry.isCurrent);
  const matchingCurrentIndex = entries.findIndex(
    (entry) => entry.mapCode === currentMapCode && entry.gamemode === currentGamemode
  );
  const currentIndex =
    flaggedCurrentIndex >= 0
      ? flaggedCurrentIndex
      : matchingCurrentIndex >= 0
        ? matchingCurrentIndex
        : -1;
  const resolvedSelectedIndex =
    entries.length > 0
      ? Math.min(Math.max(selectedIndex, 0), entries.length - 1)
      : -1;

  if (entries.length === 0 || resolvedSelectedIndex < 0) {
    return {
      current: fallbackEntry(currentMapCode, currentGamemode),
      entries,
      liveIndex: currentIndex,
      selectedIndex: resolvedSelectedIndex
    };
  }

  const current = entries[resolvedSelectedIndex];

  return {
    current: entryFromRotation(current),
    entries,
    liveIndex: currentIndex,
    selectedIndex: resolvedSelectedIndex
  };
}

function initialRotationIndex(
  rotation: MapRotationEntry[],
  currentMapCode: string | null,
  currentGamemode: string | null
): number {
  const entries = rotation.slice().sort((left, right) => left.mapIndex - right.mapIndex);
  const flaggedCurrentIndex = entries.findIndex((entry) => entry.isCurrent);
  if (flaggedCurrentIndex >= 0) {
    return flaggedCurrentIndex;
  }

  const matchingCurrentIndex = entries.findIndex(
    (entry) => entry.mapCode === currentMapCode && entry.gamemode === currentGamemode
  );

  return matchingCurrentIndex >= 0 ? matchingCurrentIndex : 0;
}

function MapBackdrop({
  entry,
  className,
  priority = false
}: {
  entry: CarouselEntry | null;
  className?: string;
  priority?: boolean;
}) {
  const imagePath = mapImagePath(entry?.mapCode ?? null);
  if (!imagePath) {
    return <div className={clsx("absolute inset-0 bg-slate-900", className)} />;
  }

  return (
    <Image
      src={imagePath}
      alt={formatMapName(entry?.mapCode ?? null)}
      fill
      sizes="(min-width: 1120px) 1088px, calc(100vw - 24px)"
      className={clsx("object-cover", className)}
      priority={priority}
      unoptimized
    />
  );
}

function roundText(entry: CarouselEntry): string | null {
  if (!entry.totalRounds || entry.totalRounds <= 1) {
    return null;
  }

  const currentRound = entry.currentRound && entry.currentRound > 0 ? entry.currentRound : 1;
  return `Round ${currentRound} of ${entry.totalRounds}`;
}

function rotationCardToneClass({
  isSelected,
  isLive,
  isNext
}: {
  isSelected: boolean;
  isLive: boolean;
  isNext: boolean;
}) {
  if (isSelected && isLive) {
    return "border-teal-200 ring-1 ring-teal-200/80";
  }

  if (isSelected && isNext) {
    return "border-amber-200 ring-1 ring-amber-200/80";
  }

  if (isSelected) {
    return "border-slate-100 ring-1 ring-slate-100/75";
  }

  if (isLive) {
    return "border-teal-300/55 hover:border-teal-200/80";
  }

  if (isNext) {
    return "border-amber-300/55 hover:border-amber-200/80";
  }

  return "border-slate-700/75 hover:border-slate-400/80";
}

function RotationBadge({
  children,
  tone
}: {
  children: ReactNode;
  tone: "live" | "next" | "neutral";
}) {
  return (
    <span
      className={clsx(
        "rounded-sm border px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        tone === "live"
          ? "border-teal-200/65 bg-teal-300/95 text-slate-950"
          : tone === "next"
            ? "border-amber-200/70 bg-amber-300/95 text-slate-950"
            : "border-slate-400/50 bg-slate-950/80 text-slate-200"
      )}
    >
      {children}
    </span>
  );
}

function RotationStrip({
  entries,
  liveIndex,
  selectedIndex,
  onSelect
}: {
  entries: MapRotationEntry[];
  liveIndex: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
          Map Rotation
        </p>
        <p className="text-xs text-slate-400">{entries.length} maps</p>
      </div>
      <ol className="mt-3 flex gap-2 overflow-x-auto px-4 pb-4 sm:px-5">
        {entries.map((entry, index) => {
          const imagePath = mapImagePath(entry.mapCode);
          const isSelected = index === selectedIndex;
          const isLive = index === liveIndex;
          return (
            <li
              key={`${entry.serverId}-${entry.mapIndex}`}
              className="shrink-0"
            >
              <button
                type="button"
                aria-label={`Show ${formatMapName(entry.mapCode)}, map ${entry.mapIndex + 1} of ${entries.length}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(index)}
                className={clsx(
                  "group relative h-28 w-44 overflow-hidden rounded-sm border bg-slate-950 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-slate-300/80",
                  rotationCardToneClass({
                    isSelected,
                    isLive,
                    isNext: entry.isNext
                  })
                )}
              >
                {imagePath ? (
                  <Image
                    src={imagePath}
                    alt={formatMapName(entry.mapCode)}
                    fill
                    sizes="176px"
                    unoptimized
                    className={clsx(
                      "object-cover opacity-55 transition duration-200 group-hover:scale-[1.025] group-hover:opacity-75",
                      isSelected ? "opacity-80" : ""
                    )}
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/20" />
                <div className="absolute left-2 top-2 rounded-sm border border-slate-300/45 bg-slate-950/85 px-1.5 py-1 text-[10px] font-semibold text-slate-200">
                  {entry.mapIndex + 1}
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  {isLive ? <RotationBadge tone="live">Current</RotationBadge> : null}
                  {entry.isNext ? <RotationBadge tone="next">Next</RotationBadge> : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-50">
                    {formatMapName(entry.mapCode)}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {formatGamemodeName(entry.gamemode)}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MapRotationCarousel({
  rotation,
  currentMapCode,
  currentGamemode,
  usedSlots,
  maxSlots,
  refreshLabel = "Refresh 30s"
}: MapRotationCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(() =>
    initialRotationIndex(rotation, currentMapCode, currentGamemode)
  );
  const context = buildRotationContext(
    rotation,
    currentMapCode,
    currentGamemode,
    selectedIndex
  );
  const { current, entries, liveIndex } = context;
  const selectedIsLive = liveIndex >= 0 && context.selectedIndex === liveIndex;
  const selectedRotationEntry =
    context.selectedIndex >= 0 ? entries[context.selectedIndex] : null;
  const selectedIsNext = Boolean(selectedRotationEntry?.isNext);
  const headingLabel = selectedIsLive
    ? "Current Round"
    : selectedIsNext
      ? "Next Up"
      : "In Rotation";
  const detailText = selectedIsLive
    ? roundText(current)
    : current.rounds && current.rounds > 1
      ? `${current.rounds} rounds`
      : null;
  const occupancyPercent =
    maxSlots > 0 ? Math.min(100, Math.round((usedSlots / maxSlots) * 100)) : 0;

  return (
    <div className="stats-panel min-w-0 overflow-hidden rounded-sm p-0">
      <div
        className={clsx(
          "relative h-48 overflow-hidden border-b border-slate-700/55 bg-slate-950 sm:h-52",
          selectedIsLive
            ? "border-teal-300/35"
            : selectedIsNext
              ? "border-amber-300/45"
              : "border-slate-700/55"
        )}
      >
        <MapBackdrop entry={current} className="opacity-90" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/42 to-slate-950/72" />
        <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className={clsx(
                  "text-[11px] font-semibold uppercase tracking-[0.18em]",
                  selectedIsLive
                    ? "text-teal-100"
                    : selectedIsNext
                      ? "text-amber-100"
                      : "text-slate-300"
                )}
              >
                {headingLabel}
              </p>
              {current.mapIndex !== null ? (
                <p className="mt-1 text-xs text-slate-400">
                  Map {current.mapIndex + 1} of {entries.length}
                </p>
              ) : null}
            </div>
            <div className="flex max-w-full flex-wrap items-start justify-end gap-2">
              {detailText ? (
                <span className="rounded-sm border border-slate-300/35 bg-slate-950/75 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 shadow-sm">
                  {detailText}
                </span>
              ) : null}
              <span className="rounded-sm border border-slate-300/35 bg-slate-950/75 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 shadow-sm">
                {refreshLabel}
              </span>
            </div>
          </div>

          <div className="min-w-0 max-w-3xl">
            <h2 className="break-words text-3xl font-semibold leading-tight text-slate-50 drop-shadow sm:text-5xl">
              {formatMapName(current.mapCode)}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-medium text-slate-200 drop-shadow">
              <span>{formatGamemodeName(current.gamemode)}</span>
              <span className="text-slate-500">·</span>
              <span>
                <span className="font-semibold text-slate-50">{usedSlots} </span>
                <span className="text-slate-300">/ {maxSlots}</span>
                <span className="text-slate-300"> online</span>
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full max-w-64 rounded-sm bg-slate-500/35 shadow-sm">
              <div
                className="h-full rounded-sm bg-teal-200 shadow-[0_0_12px_rgba(153,246,228,0.45)]"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <RotationStrip
        entries={entries}
        liveIndex={liveIndex}
        selectedIndex={context.selectedIndex}
        onSelect={setSelectedIndex}
      />
    </div>
  );
}
