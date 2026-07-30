// Floor-0 loadout screen (DESIGN.md: "5 randomly-rolled starting items...
// the player picks 2"). Resolved live with the user: no walkable floor-0
// zone this phase (that's Phase 5/6, once the hub has real fixtures to
// show) - this is a pure UI screen shown once at game start, before
// finishBoot's renderer/input wiring runs.
//
// Uses the full registerScreen + openScreen/closeScreen mechanism, not the
// lighter "skip PendingUI" shortcut glyphrogue's own docs also allow for
// purely UI-initiated screens - the user's explicit call, so a future
// core-triggered screen open (e.g. a key item's scripted "use" action)
// shares the exact same path as this player-triggered one. Confirmed by
// reading screen.js/api.js/engine.js directly: registerScreen is shared
// *storage*, not a shared *dispatch* mechanism - core never calls
// .render() itself. runLoadoutScreen below is this screen's one actual
// call site and does the real DOM work, looking the registered render
// function up via api.getScreen so a later generic PendingUI watcher (if
// one's ever needed) could reuse the same definition.
import { ITEM_CATALOG } from './items.js';
import { rollLoadoutOptions, LOADOUT_ROLL_COUNT } from './loadout.js';

export const LOADOUT_PICK_COUNT = 2;

// Pure, unit-testable, no DOM - mirrors game.js's pure/DOM split.
export function canPick(pickedIds, itemId) {
  return pickedIds.length < LOADOUT_PICK_COUNT && !pickedIds.includes(itemId);
}

export function buildEquipAction(entity, itemId) {
  return { type: 'EquipItem', entity, itemId };
}

export function registerLoadoutScreen(api) {
  api.registerScreen('loadout', {
    render({ rolledItemIds, pickedIds }, { container, onPick }) {
      container.innerHTML = '';

      const overlay = document.createElement('div');
      overlay.id = 'loadout-screen';
      overlay.style.cssText =
        'position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; ' +
        'align-items:center; justify-content:center; gap:0.6em; background:rgba(0,0,0,0.9); ' +
        'color:#e0e0e0; font-family:monospace; font-size:1.1em; text-align:center; padding:1em;';

      const remaining = LOADOUT_PICK_COUNT - pickedIds.length;
      const heading = document.createElement('div');
      heading.textContent =
        remaining > 0
          ? `Glyphrey: "Pick ${remaining} more, don't get greedy though..."`
          : 'Glyphrey: "I think that will get you started..."';
      overlay.appendChild(heading);

      for (const itemId of rolledItemIds) {
        const item = ITEM_CATALOG[itemId];
        const picked = pickedIds.includes(itemId);

        const row = document.createElement('div');
        row.textContent = `${item.name} (${item.slot}) `;

        const button = document.createElement('button');
        button.textContent = picked ? 'Picked' : 'Pick';
        button.disabled = picked || !canPick(pickedIds, itemId);
        button.addEventListener('click', () => onPick(itemId));
        row.appendChild(button);

        overlay.appendChild(row);
      }

      container.appendChild(overlay);
    },
  });
}

export function runLoadoutScreen({ api, player, container, onComplete, catalog = ITEM_CATALOG }) {
  const screen = api.getScreen('loadout');
  const rolledItemIds = rollLoadoutOptions(api, catalog, LOADOUT_ROLL_COUNT);

  function render(pickedIds) {
    screen.render(
      { rolledItemIds, pickedIds },
      {
        container,
        onPick(itemId) {
          if (!canPick(pickedIds, itemId)) return;
          api.dispatch(buildEquipAction(player, itemId)); // not a scheduler turn - equipping isn't gameplay time
          const nextPickedIds = [...pickedIds, itemId];

          if (nextPickedIds.length >= LOADOUT_PICK_COUNT) {
            container.innerHTML = '';
            api.closeScreen(player, { type: 'CompleteLoadout', entity: player, cost: 0 });
            onComplete();
            return;
          }

          api.addComponent(player, 'PendingUI', { screenId: 'loadout', payload: { rolledItemIds, pickedIds: nextPickedIds } });
          render(nextPickedIds);
        },
      },
    );
  }

  // player must already be a registered scheduler actor before this closes
  // (closeScreen -> resolvePlayerAction -> spend, which now throws rather
  // than corrupting state for an unregistered entity - see BACKLOG.md's
  // cross-project section). Both entry points call api.addActor(player, 0)
  // before this function runs.
  api.openScreen(player, 'loadout', { rolledItemIds, pickedIds: [] });
  render([]);
}
