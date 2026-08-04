// Runs synchronously in <head>, before the body (and the intro overlay
// inside it) is ever painted. Without this, the overlay markup below
// -- opaque, full-viewport, no default display:none -- gets rendered
// as soon as the browser parses it, then sits there until script.js
// (loaded at the end of body) finally runs and removes it on repeat
// visits. That gap between paint and removal is a real flash, not a
// perceived one, every time this page loads after the first: browsing
// project -> index#about, refreshing, opening a new tab, etc. Setting
// .no-intro on <html> here, before the overlay div even exists in the
// DOM, lets a plain CSS rule keep it hidden from its very first frame.
//
// This lives in its own file (rather than inline in <head>) so the
// site's CSP can use script-src 'self' without 'unsafe-inline'.
(function () {
  try {
    var seen = sessionStorage.getItem('gh_intro_seen');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || reduced) document.documentElement.classList.add('no-intro');
  } catch (e) {}
})();
