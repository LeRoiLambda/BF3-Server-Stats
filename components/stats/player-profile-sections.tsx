"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { SegmentedTabs } from "@/components/layout/segmented-tabs";
import { ui } from "@/components/layout/stats-ui";
import {
  PlayerTableCellLink,
  playerTableRowClass
} from "@/components/stats/player-link";

export type DogtagView = "collected" | "surrendered";

export type PlayerWeaponCategory = {
  categoryKey: string;
  categoryName: string;
};

export type PlayerWeaponStat = {
  weaponCode: string | null;
  weaponName: string;
  weaponImageSrc: string;
  categoryKey: string;
  categoryName: string;
  kills: number;
  deaths: number;
  headshots: number;
  hsr: number;
};

type PlayerDogtagLoss = {
  killerId: number;
  killerName: string;
  tagCount: number;
};

type PlayerDogtagLossResult = {
  available: boolean;
  entries: PlayerDogtagLoss[];
};

type PlayerDogtagCollection = {
  victimId: number;
  victimName: string;
  tagCount: number;
};

type PlayerDogtagCollectionResult = {
  available: boolean;
  entries: PlayerDogtagCollection[];
};

type PlayerProfileSectionsProps = {
  weaponCategories: PlayerWeaponCategory[];
  weapons: PlayerWeaponStat[];
  initialWeaponCategory: string | null;
  initialDogtagView: DogtagView;
  dogtagLosses: PlayerDogtagLossResult;
  dogtagCollections: PlayerDogtagCollectionResult;
  serverId: number | null;
};

function resolveInitialWeaponCategory(
  categories: PlayerWeaponCategory[],
  initialCategory: string | null
): string | null {
  if (
    initialCategory !== null &&
    categories.some((category) => category.categoryKey === initialCategory)
  ) {
    return initialCategory;
  }

  return categories[0]?.categoryKey ?? null;
}

export function PlayerProfileSections({
  weaponCategories,
  weapons,
  initialWeaponCategory,
  initialDogtagView,
  dogtagLosses,
  dogtagCollections,
  serverId
}: PlayerProfileSectionsProps) {
  const [selectedWeaponCategory, setSelectedWeaponCategory] = useState<string | null>(() =>
    resolveInitialWeaponCategory(weaponCategories, initialWeaponCategory)
  );
  const [tagView, setTagView] = useState<DogtagView>(initialDogtagView);

  const displayedWeapons = useMemo(
    () =>
      selectedWeaponCategory === null
        ? []
        : weapons.filter((weapon) => weapon.categoryKey === selectedWeaponCategory),
    [selectedWeaponCategory, weapons]
  );
  const displayedWeaponTotals = useMemo(
    () =>
      displayedWeapons.reduce(
        (totals, weapon) => ({
          kills: totals.kills + weapon.kills,
          deaths: totals.deaths + weapon.deaths,
          headshots: totals.headshots + weapon.headshots
        }),
        { kills: 0, deaths: 0, headshots: 0 }
      ),
    [displayedWeapons]
  );

  return (
    <>
      <section className={`mt-6 ${ui.panel}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className={ui.sectionTitle}>
              Weapon Stats
            </h2>
          </div>
          <div className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">{displayedWeapons.length}</span>{" "}
            weapons
          </div>
        </div>

        {weaponCategories.length > 0 ? (
          <SegmentedTabs
            label="Weapon category"
            className="mb-4"
            value={selectedWeaponCategory}
            onChange={setSelectedWeaponCategory}
            items={weaponCategories.map((category) => ({
              label: category.categoryName,
              value: category.categoryKey
            }))}
          />
        ) : null}

        {displayedWeapons.length > 0 ? (
          <div className="mb-4 grid overflow-hidden rounded-sm border border-slate-700/60 bg-slate-950/45 text-sm sm:grid-cols-3">
            <div className="border-b border-slate-700/60 p-3 sm:border-b-0 sm:border-r">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Kills</p>
              <p className="mt-2 font-semibold text-slate-100">{displayedWeaponTotals.kills}</p>
            </div>
            <div className="border-b border-slate-700/60 p-3 sm:border-b-0 sm:border-r">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Deaths</p>
              <p className="mt-2 font-semibold text-slate-100">{displayedWeaponTotals.deaths}</p>
            </div>
            <div className="p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Headshots</p>
              <p className="mt-2 font-semibold text-slate-100">{displayedWeaponTotals.headshots}</p>
            </div>
          </div>
        ) : null}

        <div className={ui.tableShell}>
          <table className={ui.table}>
            <thead className={ui.tableHead}>
              <tr>
                <th className={ui.th}>#</th>
                <th className={ui.th}>Icon</th>
                <th className={ui.th}>Weapon</th>
                <th className={ui.th}>Kills</th>
                <th className={ui.th}>Deaths</th>
                <th className={ui.th}>Headshots</th>
                <th className={ui.th}>HSR</th>
              </tr>
            </thead>
            <tbody>
              {displayedWeapons.length === 0 ? (
                <tr className={ui.tableRow}>
                  <td className={ui.emptyCell} colSpan={7}>
                    No weapon stats found.
                  </td>
                </tr>
              ) : (
                displayedWeapons.map((weapon, index) => (
                  <tr
                    key={`${weapon.weaponCode ?? weapon.weaponName}-${index}`}
                    className={ui.tableRow}
                  >
                    <td className={ui.td}>{index + 1}</td>
                    <td className={ui.td}>
                      <Image
                        src={weapon.weaponImageSrc}
                        alt={weapon.weaponName}
                        width={32}
                        height={24}
                        className="h-6 w-8 rounded-sm bg-slate-900/50 object-contain"
                      />
                    </td>
                    <td className={ui.td}>{weapon.weaponName}</td>
                    <td className={ui.td}>{weapon.kills}</td>
                    <td className={ui.td}>{weapon.deaths}</td>
                    <td className={ui.td}>{weapon.headshots}</td>
                    <td className={ui.td}>{weapon.hsr.toFixed(2)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`mt-6 ${ui.panel}`}>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={ui.sectionTitle}>
            Dog Tags
          </h2>
          <SegmentedTabs
            label="Dog tag view"
            value={tagView}
            onChange={(value) => {
              setTagView(value === "surrendered" ? "surrendered" : "collected");
            }}
            items={[
              {
                label: "Collected",
                value: "collected"
              },
              {
                label: "Surrendered",
                value: "surrendered"
              }
            ]}
          />
        </div>

        {tagView === "collected" ? (
          !dogtagCollections.available ? (
            <p className="text-sm text-slate-400">
              Dog tags unavailable.
            </p>
          ) : (
            <div className={ui.tableShell}>
              <table className={ui.table}>
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.th}>#</th>
                    <th className={ui.th}>Victim</th>
                    <th className={ui.th}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {dogtagCollections.entries.length === 0 ? (
                    <tr className={ui.tableRow}>
                      <td className={ui.emptyCell} colSpan={3}>
                        No collected dog tags found.
                      </td>
                    </tr>
                  ) : (
                    dogtagCollections.entries.map((entry, index) => (
                      <tr
                        key={`${entry.victimId}-${index}`}
                        className={playerTableRowClass(ui.tableRow)}
                      >
                        <td className={ui.td}>
                          <PlayerTableCellLink
                            playerId={entry.victimId}
                            serverId={serverId}
                          >
                            {index + 1}
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink
                            playerId={entry.victimId}
                            serverId={serverId}
                          >
                            {entry.victimName}
                          </PlayerTableCellLink>
                        </td>
                        <td className={ui.td}>
                          <PlayerTableCellLink
                            playerId={entry.victimId}
                            serverId={serverId}
                          >
                            {entry.tagCount}
                          </PlayerTableCellLink>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : !dogtagLosses.available ? (
          <p className="text-sm text-slate-400">
            Dog tags unavailable.
          </p>
        ) : (
          <div className={ui.tableShell}>
            <table className={ui.table}>
              <thead className={ui.tableHead}>
                <tr>
                  <th className={ui.th}>#</th>
                  <th className={ui.th}>Killer</th>
                  <th className={ui.th}>Count</th>
                </tr>
              </thead>
              <tbody>
                {dogtagLosses.entries.length === 0 ? (
                  <tr className={ui.tableRow}>
                    <td className={ui.emptyCell} colSpan={3}>
                      No one has taken this player&apos;s tags.
                    </td>
                  </tr>
                ) : (
                  dogtagLosses.entries.map((entry, index) => (
                    <tr
                      key={`${entry.killerId}-${index}`}
                      className={playerTableRowClass(ui.tableRow)}
                    >
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={entry.killerId}
                          serverId={serverId}
                        >
                          {index + 1}
                        </PlayerTableCellLink>
                      </td>
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={entry.killerId}
                          serverId={serverId}
                        >
                          {entry.killerName}
                        </PlayerTableCellLink>
                      </td>
                      <td className={ui.td}>
                        <PlayerTableCellLink
                          playerId={entry.killerId}
                          serverId={serverId}
                        >
                          {entry.tagCount}
                        </PlayerTableCellLink>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
