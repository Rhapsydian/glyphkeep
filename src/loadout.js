// Floor-0 loadout roll (DESIGN.md: "5 randomly-rolled starting items... the
// player picks 2"). A plain sample-N-distinct-without-replacement helper
// against api.rng - resolved live as glyphkeep-local content, not a
// glyphrogue gap: a different operation from the engine's internal (and
// unexported) weightedPick/pickWeighted, which are single-item, weighted,
// with-replacement picks. See BACKLOG.md's cross-project section for the
// related-but-distinct logged item this deliberately doesn't reopen.
import { ITEM_CATALOG } from './items.js';

export const LOADOUT_ROLL_COUNT = 5;

export function rollLoadoutOptions(api, catalog = ITEM_CATALOG, count = LOADOUT_ROLL_COUNT) {
  const pool = Object.keys(catalog);
  if (count > pool.length) {
    throw new Error(
      `rollLoadoutOptions: cannot sample ${count} distinct items from a catalog of ${pool.length}`,
    );
  }

  const picked = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(api.rng.next() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}
