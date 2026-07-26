// Bare placeholder screens (Phase 1 scope: "reaching floor 10 as a trivial
// win" - not the real win/death-summary screens DESIGN.md describes, those
// are later phases). A plain DOM overlay is enough to prove the condition
// actually fires; checkpoint 4 adds the death-screen sibling of this.
function showOverlay(container, id, text) {
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.textContent = text;
  overlay.style.cssText = 'position:absolute; top:0; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.85); color:#e0e0e0; font-family:monospace; font-size:1.5em; text-align:center; padding:1em;';
  container.appendChild(overlay);
}

export function showWinScreen(container) {
  showOverlay(container, 'win-screen', 'You reached floor 10. (placeholder win screen)');
}

// Permadeath (DESIGN.md's Win/lose section): no save/continue, just this
// bare placeholder - not the real death/run-summary screen, that's Phase 4
// (meta-progression).
export function showDeathScreen(container, floorNumber) {
  showOverlay(container, 'death-screen', `You died on floor ${floorNumber}. (placeholder death screen)`);
}
