// Mid-run inventory/equipment screen (DESIGN.md's Screens section: "with
// the Relics tab for boons" - no boons exist yet, Phase 5+, so this phase
// is just the weapon/armor half). Same registerScreen + openScreen/
// closeScreen mechanism as loadoutScreen.js, for the same reason (decision
// 4: a uniform path for any future core-triggered open). Unlike loadout,
// there's no separate "in-progress pick" state to mirror into PendingUI's
// payload - every equip/unequip here writes straight through to the real
// Equipment/Inventory components on click, so the screen's displayed view
// and the world state are always the same thing.
//
// Invoked via a dedicated 'I' keybind (input.js) while gameplay is active -
// a placeholder entry point until Phase 6's pause menu supersedes it.
import { ITEM_CATALOG } from './items.js';

// Pure, unit-testable, no DOM.
export function describeEquipment(api, player, catalog = ITEM_CATALOG) {
  const equipment = api.getComponent(player, 'Equipment') ?? { weaponId: null, armorId: null };
  const inventory = api.getComponent(player, 'Inventory') ?? { itemIds: [] };

  const weapon = equipment.weaponId ? { itemId: equipment.weaponId, ...catalog[equipment.weaponId] } : null;
  const armor = equipment.armorId ? { itemId: equipment.armorId, ...catalog[equipment.armorId] } : null;

  const owned = inventory.itemIds.map((itemId) => ({
    itemId,
    ...catalog[itemId],
    equipped: itemId === equipment.weaponId || itemId === equipment.armorId,
  }));

  return { weapon, armor, owned };
}

export function registerInventoryScreen(api) {
  api.registerScreen('inventory', {
    render({ weapon, armor, owned }, { container, onEquip, onUnequip, onClose }) {
      container.innerHTML = '';

      const overlay = document.createElement('div');
      overlay.id = 'inventory-screen';
      overlay.style.cssText =
        'position:absolute; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; ' +
        'align-items:center; justify-content:center; gap:0.6em; background:rgba(0,0,0,0.9); ' +
        'color:#e0e0e0; font-family:monospace; font-size:1.1em; text-align:center; padding:1em;';

      const heading = document.createElement('div');
      heading.textContent = 'Inventory';
      overlay.appendChild(heading);

      for (const [slot, equipped] of [['weapon', weapon], ['armor', armor]]) {
        const row = document.createElement('div');
        row.textContent = `${slot === 'weapon' ? 'Weapon' : 'Armor'}: ${equipped ? equipped.name : '(none)'} `;
        if (equipped) {
          const button = document.createElement('button');
          button.textContent = 'Unequip';
          button.addEventListener('click', () => onUnequip(slot));
          row.appendChild(button);
        }
        overlay.appendChild(row);
      }

      const ownedHeading = document.createElement('div');
      ownedHeading.textContent = 'Owned:';
      overlay.appendChild(ownedHeading);

      for (const item of owned) {
        const row = document.createElement('div');
        row.textContent = `${item.name} (${item.slot})${item.equipped ? ' [equipped]' : ''} `;
        if (!item.equipped) {
          const button = document.createElement('button');
          button.textContent = 'Equip';
          button.addEventListener('click', () => onEquip(item.itemId));
          row.appendChild(button);
        }
        overlay.appendChild(row);
      }

      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.addEventListener('click', onClose);
      overlay.appendChild(closeButton);

      container.appendChild(overlay);
    },
  });
}

export function openInventoryScreen({ api, player, container, captureStack, catalog = ITEM_CATALOG }) {
  const screen = api.getScreen('inventory');

  function render() {
    screen.render(describeEquipment(api, player, catalog), {
      container,
      onEquip(itemId) {
        api.dispatch({ type: 'EquipItem', entity: player, itemId });
        render();
      },
      onUnequip(slot) {
        api.dispatch({ type: 'UnequipItem', entity: player, slot });
        render();
      },
      onClose() {
        container.innerHTML = '';
        api.closeScreen(player, { type: 'CloseInventory', entity: player, cost: 0 });
        captureStack.pop();
      },
    });
  }

  captureStack.push('inventory');
  api.openScreen(player, 'inventory', {});
  render();
}
