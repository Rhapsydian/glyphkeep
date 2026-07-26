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
