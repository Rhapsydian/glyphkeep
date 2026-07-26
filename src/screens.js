// Bare placeholder screens (Phase 1 scope: "reaching floor 10 as a trivial
// win" - not the real win/death-summary screens DESIGN.md describes, those
// are later phases). A plain DOM overlay is enough to prove the condition
// actually fires; checkpoint 4 adds the death-screen sibling of this.
export function showWinScreen(container) {
  const overlay = document.createElement('div');
  overlay.id = 'win-screen';
  overlay.textContent = 'You reached floor 10. (placeholder win screen)';
  overlay.style.cssText = 'position:absolute; top:0; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.85); color:#e0e0e0; font-family:monospace; font-size:1.5em; text-align:center; padding:1em;';
  container.appendChild(overlay);
}
