// `next build` leaves public/ and .next/static/ out of the standalone bundle;
// copying them in lets .next/standalone run on its own.
import { cpSync, rmSync } from "node:fs";

const bundle = ".next/standalone";

for (const [source, target] of [
  ["public", `${bundle}/public`],
  [".next/static", `${bundle}/.next/static`]
]) {
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}
