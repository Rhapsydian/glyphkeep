// glyphkeep's own action/rule content (DESIGN.md's Combat section: "no
// built-in combat system exists anywhere in glyphrogue/packages/core" -
// this is entirely game-authored, on top of the generic dispatch pipeline).
// No first-party 'Move'-type rule exists anywhere in glyphrogue either -
// every AI behavior (wandersRule etc.) emits a {type: 'Move', entity, to,
// cost} followOn, but nothing in core ever resolves it into a real
// Position update. This is that resolver.
import { DEFAULT_MOVE_COST, WANDERS_PRIORITY } from '@glyphrogue/core';

// The player's own move cost has to equal every behavior rule's move cost
// (DEFAULT_MOVE_COST) for "uniform one action per turn" to actually hold -
// derived from the real engine constant, not independently redeclared
// (glyphrogue session: this used to be a second, separately-arrived-at
// "100" here).
export const MOVE_COST = DEFAULT_MOVE_COST;

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
// weapon min-max damage roll, both against a seeded RNG. WEAPON_MIN_DAMAGE/
// MAX_DAMAGE stay exported as the baseline "unarmed" roll - equipment.js's
// EquipItem rule writes a per-entity WeaponDamage component that overrides
// this below, once the player has a weapon equipped (Phase 3). No enemy
// ever carries WeaponDamage, so every enemy attack still rolls this same
// fixed baseline, unchanged.
export const HIT_CHANCE = 0.8;
export const WEAPON_MIN_DAMAGE = 1;
export const WEAPON_MAX_DAMAGE = 4;

// Phase 2: Defense now does double duty (damage reduction below, and
// accuracy reduction here) rather than adding a 4th stat just for the
// wraith's "hard to hit" identity - DESIGN.md explicitly wants to stay lean
// on stats. MIN_HIT_CHANCE keeps even an extremely high-Defense target
// (the wraith) never truly unhittable.
export const DEFENSE_EVASION_PER_POINT = 0.05;
export const MIN_HIT_CHANCE = 0.2;

function resolveHitChance(defense) {
  return Math.max(MIN_HIT_CHANCE, HIT_CHANCE - defense * DEFENSE_EVASION_PER_POINT);
}

// Duke Glyphmund's enrage phase (DESIGN.md: "base AI is Guards-style...
// with a bespoke rule layered on top for a real boss feel"). A bump to
// this same shared attackRule when the attacker carries Boss and is at or
// below half health, not a second registered Attack rule - dispatch()
// applies every matching rule's effect additively (unlike dispatchExclusive),
// so two competing Attack rules for the same action would double-resolve
// the same hit into two damage applications.
export const BOSS_ENRAGE_HEALTH_RATIO = 0.5;
export const BOSS_ENRAGE_HIT_CHANCE_BONUS = 0.15;
export const BOSS_ENRAGE_DAMAGE_BONUS = 3;

function isEnraged(ctx, entity) {
  if (!ctx.hasComponent(entity, 'Boss')) return false;
  const health = ctx.getComponent(entity, 'Health');
  return health.current <= health.max * BOSS_ENRAGE_HEALTH_RATIO;
}

// Player baseline stats - no leveling/equipment exists yet (Phases 3-4),
// so this is a fixed starting point, not the real build-variety system
// DESIGN.md describes.
export const PLAYER_HEALTH = 20;
export const PLAYER_ATTACK = 5;
export const PLAYER_DEFENSE = 2;

// ctx.rng is real as of glyphrogue session 44 (threaded through
// dispatch/engine/createContext the same way mapQuery/renderEvents/
// scheduler already were) and is the exact same live object as api.rng -
// no more separate seeded stream workaround (see BACKLOG.md's
// cross-project section for the gap this replaced).
export function createAttackRule() {
  return function attackRule(action, ctx) {
    const { entity: attacker, target } = action;
    if (!ctx.hasComponent(target, 'Health')) return undefined;

    const enraged = isEnraged(ctx, attacker);
    const defense = ctx.getComponent(target, 'Defense')?.value ?? 0;
    const hitChance = enraged
      ? Math.min(1, resolveHitChance(defense) + BOSS_ENRAGE_HIT_CHANCE_BONUS)
      : resolveHitChance(defense);
    if (ctx.rng.next() >= hitChance) return undefined; // miss

    const attack = ctx.getComponent(attacker, 'Attack')?.value ?? 0;
    const weaponDamage = ctx.getComponent(attacker, 'WeaponDamage') ?? { min: WEAPON_MIN_DAMAGE, max: WEAPON_MAX_DAMAGE };
    const roll = weaponDamage.min + Math.floor(ctx.rng.next() * (weaponDamage.max - weaponDamage.min + 1));
    const enrageDamage = enraged ? BOSS_ENRAGE_DAMAGE_BONUS : 0;
    const damage = Math.max(1, roll + attack + enrageDamage - defense);

    const health = ctx.getComponent(target, 'Health');
    const nextCurrent = Math.max(0, health.current - damage);
    ctx.addComponent(target, 'Health', { ...health, current: nextCurrent });

    if (nextCurrent === 0) {
      return { followOn: [{ type: 'Die', entity: target }] };
    }
    return undefined;
  };
}

export function registerAttackRule(api) {
  api.registerRule('attack', 'Attack', createAttackRule());
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

// DESIGN.md's Combat section: "uniform one action per turn for everyone."
// glyphrogue's stock behavior rules don't guarantee this - guardsRule
// legitimately returns undefined (no followOn) whenever its entity is
// already at its post, which is exactly what happens on the very turn a
// Guards-type enemy spawns (floor.js seeds Guards.post from the entity's
// own spawn position). A TakeTurn that resolves to zero followOn spends
// zero cost, and scheduler.next()'s tie-break keeps re-selecting that same
// never-decreasing-budget actor forever - api.run()'s while loop hangs
// without ever reaching the player's turn (found live: froze the dev
// server's tab solid on the very first render). Same failure class as the
// empty-scheduler hang already fixed in glyphrogue, but a different
// trigger (a legitimately-idle actor, not zero actors) - flagged in
// BACKLOG.md's cross-project section as a possible future scheduler
// safeguard, fixed here for now as glyphkeep-authored content, same
// framing as Move/Attack/Die already are.
//
// No components filter (matches every entity) and a priority below every
// first-party behavior's (derived from the real WANDERS_PRIORITY, the
// lowest of the four, rather than a bare -1 that silently drifts if that
// ordering is ever retuned) - so any behavior that actually produced a real
// followOn this turn always wins dispatchExclusive's resolution, and this
// only fires when literally nothing else had anything to do.
export const PASS_COST = DEFAULT_MOVE_COST;
export const PASS_FALLBACK_PRIORITY = WANDERS_PRIORITY - 1;

function passRule() {
  return undefined;
}

function fallbackTurnRule(action) {
  return { followOn: [{ type: 'Pass', entity: action.entity, cost: PASS_COST }] };
}

export function registerPassFallbackRule(api) {
  api.registerRule('pass', 'Pass', passRule);
  api.registerRule('fallback-turn', 'TakeTurn', fallbackTurnRule, { priority: PASS_FALLBACK_PRIORITY });
}
