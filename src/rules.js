// glyphkeep's own action/rule content (DESIGN.md's Combat section: "no
// built-in combat system exists anywhere in glyphrogue/packages/core" -
// this is entirely game-authored, on top of the generic dispatch pipeline).
// No first-party 'Move'-type rule exists anywhere in glyphrogue either -
// every AI behavior (wandersRule etc.) emits a {type: 'Move', entity, to,
// cost} followOn, but nothing in core ever resolves it into a real
// Position update. This is that resolver.

export const MOVE_COST = 100;

function entityAt(ctx, x, y, excluding) {
  return ctx
    .query(['Position', 'Health'])
    .find((entity) => {
      if (entity === excluding) return false;
      const position = ctx.getComponent(entity, 'Position');
      return position.x === x && position.y === y;
    });
}

// Bump-to-attack (DESIGN.md's Combat section): moving into a cell occupied
// by a Health-bearing entity becomes an Attack instead of a position
// change. No enemies exist yet in checkpoint 2, so this branch is only
// exercised by its own unit test until checkpoint 4 adds the Attack rule
// itself and real Health-bearing enemies to bump into.
export function moveRule(action, ctx) {
  const { entity, to } = action;
  const position = ctx.getComponent(entity, 'Position');

  const occupant = entityAt(ctx, to.x, to.y, entity);
  if (occupant !== undefined) {
    return { followOn: [{ type: 'Attack', entity, target: occupant }] };
  }

  const path = ctx.findPath(position, to);
  if (!path) return undefined;

  ctx.addComponent(entity, 'Position', { ...position, x: to.x, y: to.y });
  return undefined;
}

export function registerMoveRule(api) {
  api.registerRule('move', 'Move', moveRule);
}

// Combat (DESIGN.md's Combat section): accuracy/evasion check plus a
// weapon min-max damage roll, both against a seeded RNG. No equipment
// system exists yet (Phase 3), so every attacker uses this same fixed
// baseline "weapon" regardless of who's swinging.
export const HIT_CHANCE = 0.8;
export const WEAPON_MIN_DAMAGE = 1;
export const WEAPON_MAX_DAMAGE = 4;

// Player baseline stats - no leveling/equipment exists yet (Phases 3-4),
// so this is a fixed starting point, not the real build-variety system
// DESIGN.md describes.
export const PLAYER_HEALTH = 20;
export const PLAYER_ATTACK = 5;
export const PLAYER_DEFENSE = 2;

// A rule's ctx (actions.js's createContext) has no rng access at all -
// only a *generator*'s ctx does (mapgen.js). Flagged in BACKLOG.md's
// cross-project section rather than fixed in glyphrogue: threading rng
// through dispatch/engine/createContext the way mapQuery/renderEvents/
// scheduler already are is a real architectural change, not a small
// export fix, so it's logged for its own conversation rather than decided
// solo. Workaround: glyphkeep keeps its own seeded rng instance (see
// main.js/dev-main.js) and passes it into this rule directly.
export function createAttackRule(rng) {
  return function attackRule(action, ctx) {
    const { entity: attacker, target } = action;
    if (!ctx.hasComponent(target, 'Health')) return undefined;

    if (rng.next() >= HIT_CHANCE) return undefined; // miss

    const attack = ctx.getComponent(attacker, 'Attack')?.value ?? 0;
    const defense = ctx.getComponent(target, 'Defense')?.value ?? 0;
    const roll = WEAPON_MIN_DAMAGE + Math.floor(rng.next() * (WEAPON_MAX_DAMAGE - WEAPON_MIN_DAMAGE + 1));
    const damage = Math.max(1, roll + attack - defense);

    const health = ctx.getComponent(target, 'Health');
    const nextCurrent = Math.max(0, health.current - damage);
    ctx.addComponent(target, 'Health', { ...health, current: nextCurrent });

    if (nextCurrent === 0) {
      return { followOn: [{ type: 'Die', entity: target }] };
    }
    return undefined;
  };
}

export function registerAttackRule(api, rng) {
  api.registerRule('attack', 'Attack', createAttackRule(rng));
}

// The player's own death is detected and handled by the outer game loop
// (checking Health after each turn), not by this rule - destroying the
// player entity here would remove it before that check ever runs, since
// dispatch resolves the whole follow-on queue synchronously. A defeated
// enemy has no such outer check, so it's fully cleaned up right here.
export function dieRule(action, ctx) {
  if (ctx.hasComponent(action.entity, 'PlayerControlled')) return undefined;

  ctx.removeActor(action.entity);
  ctx.destroyEntity(action.entity);
  return undefined;
}

export function registerDieRule(api) {
  api.registerRule('die', 'Die', dieRule);
}
