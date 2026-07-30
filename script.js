// ===================== Arcade intro: mini Tron preview =====================
// A small, self-contained light-cycle-style animation for the arcade
// screen. Deliberately NOT the real grid engine (createGridEngine) --
// different sizing model (a small fixed container instead of the full
// page) and this is disposable/torn down within a few seconds, so it's
// not worth coupling to the real game's logic. Same visual language
// (colored trail + glowing head, simple turn-avoid-the-wall movement),
// scaled down.
function startMiniTronPreview(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  const CELL = 6;
  const rect = canvas.getBoundingClientRect();
  const cols = Math.max(Math.floor(rect.width / CELL), 10);
  const rows = Math.max(Math.floor(rect.height / CELL), 10);
  canvas.width = cols * CELL * dpr;
  canvas.height = rows * CELL * dpr;
  canvas.style.width = `${cols * CELL}px`;
  canvas.style.height = `${rows * CELL}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const TURNS = { up: ['left', 'right'], down: ['left', 'right'], left: ['up', 'down'], right: ['up', 'down'] };
  const COLORS = ['#37f4ff', '#7c6bff', '#ffb84d'];

  let grid;
  let bots;

  function inBounds(x, y) { return x >= 0 && y >= 0 && x < cols && y < rows; }
  function isFree(x, y) { return inBounds(x, y) && !grid[y][x]; }

  function spawn(id, color) {
    const margin = 2;
    const x = margin + Math.floor(Math.random() * Math.max(cols - margin * 2, 1));
    const y = margin + Math.floor(Math.random() * Math.max(rows - margin * 2, 1));
    const dir = Object.keys(DIRS)[Math.floor(Math.random() * 4)];
    return { id, color, x, y, dir, alive: true, trail: [{ x, y }] };
  }

  function reset() {
    grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
    bots = COLORS.map((c, i) => spawn(i, c));
    bots.forEach((b) => { grid[b.y][b.x] = b.id + 1; });
  }
  reset();

  function chooseDir(bot) {
    const candidates = [bot.dir, ...TURNS[bot.dir]].filter((dir) => {
      const d = DIRS[dir];
      return isFree(bot.x + d.x, bot.y + d.y);
    });
    if (!candidates.length) return bot.dir;
    if (candidates.includes(bot.dir) && Math.random() < 0.65) return bot.dir;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function tick() {
    const alive = bots.filter((b) => b.alive);
    if (alive.length <= 1) { reset(); return; }
    const moves = alive.map((b) => {
      const dir = chooseDir(b);
      const d = DIRS[dir];
      return { bot: b, dir, nx: b.x + d.x, ny: b.y + d.y };
    });
    moves.forEach((m) => {
      const row = grid[m.ny];
      const dead = !inBounds(m.nx, m.ny) || (row && row[m.nx]) ||
        moves.some((o) => o !== m && o.nx === m.nx && o.ny === m.ny);
      if (dead) { m.bot.alive = false; return; }
      m.bot.dir = m.dir;
      m.bot.x = m.nx;
      m.bot.y = m.ny;
      m.bot.trail.push({ x: m.nx, y: m.ny });
      grid[m.ny][m.nx] = m.bot.id + 1;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, cols * CELL, rows * CELL);
    bots.forEach((bot) => {
      const trail = bot.trail;
      if (trail.length > 1) {
        ctx.strokeStyle = bot.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(trail[0].x * CELL + CELL / 2, trail[0].y * CELL + CELL / 2);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x * CELL + CELL / 2, trail[i].y * CELL + CELL / 2);
        }
        ctx.stroke();
      }
      if (bot.alive) {
        ctx.fillStyle = bot.color;
        ctx.shadowColor = bot.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(bot.x * CELL + 1, bot.y * CELL + 1, CELL - 2, CELL - 2);
        ctx.shadowBlur = 0;
      }
    });
  }

  const handle = setInterval(() => { tick(); draw(); }, 90);
  draw();
  return function stop() { clearInterval(handle); };
}

// ===================== Arcade intro sequence =====================
// Replaces the old typed-out fake boot log: an arcade cabinet holds the
// mini preview above for a beat, then the cabinet scales up (CSS
// transition) centered exactly on the screen -- transform-origin is
// computed here from the screen's real bounding box -- while the bezel/
// marquee/panel fade out, reading as diving through the screen. The real
// site has been sitting rendered underneath the whole time; the overlay
// just fades away at the end to reveal it. Total: ~1.4s preview + 1s zoom
// + 0.6s fade, roughly the "three seconds" this was asked for.
function runIntroSequence() {
  const overlay = document.getElementById('introOverlay');
  const canvas = document.getElementById('introCanvas');
  const cabinet = document.getElementById('arcadeCabinet');
  const screenEl = document.getElementById('arcadeScreen');
  const skipBtn = document.getElementById('introSkip');
  const label = document.getElementById('introLabel');
  if (!overlay || !canvas || !cabinet || !screenEl || !skipBtn) return;

  let seen = null;
  try { seen = sessionStorage.getItem('gh_intro_seen'); } catch (e) {}
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || reduced) {
    overlay.remove();
    return;
  }

  let stopPreview = null;
  requestAnimationFrame(() => {
    stopPreview = startMiniTronPreview(canvas);
  });

  let finished = false;
  function zoomIn() {
    if (finished) return;
    finished = true;
    if (label) label.classList.add('hidden');
    window.removeEventListener('keydown', onKey);
    skipBtn.removeEventListener('click', zoomIn);

    const screenRect = screenEl.getBoundingClientRect();
    const cabinetRect = cabinet.getBoundingClientRect();
    const originX = ((screenRect.left + screenRect.width / 2 - cabinetRect.left) / cabinetRect.width) * 100;
    const originY = ((screenRect.top + screenRect.height / 2 - cabinetRect.top) / cabinetRect.height) * 100;
    cabinet.style.transformOrigin = `${originX}% ${originY}%`;
    overlay.classList.add('zooming');

    setTimeout(() => {
      overlay.classList.add('hidden');
      if (stopPreview) stopPreview();
      try { sessionStorage.setItem('gh_intro_seen', '1'); } catch (e) {}
      setTimeout(() => overlay.remove(), 650);
    }, 1000);
  }

  function onKey() { zoomIn(); }
  window.addEventListener('keydown', onKey, { once: true });
  skipBtn.addEventListener('click', zoomIn);

  setTimeout(() => skipBtn.classList.add('visible'), 500);
  setTimeout(zoomIn, 1400);
}

// ===================== Hero eyebrow typewriter =====================
// scrollWidth reports the element's true content width even while it's
// still clipped to width:0 by overflow:hidden, so this is accurate
// regardless of font/letter-spacing quirks that a hardcoded ch value isn't.
function setupTypewriter() {
  const el = document.querySelector('.hero-eyebrow');
  if (!el) return;
  const target = el.scrollWidth;
  requestAnimationFrame(() => {
    el.style.width = `${target}px`;
    el.classList.add('typed');
  });
}

// ===================== Text scramble (prescript demo) =====================
// Mirrors the real firmware's "scramble reveal" text renderer (see
// drawPrescript() in beeper.ino) — characters cycle through noise before
// settling into place, left to right, instead of just appearing.
const SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function scrambleText(el, finalText) {
  const duration = Math.min(Math.max(finalText.length * 50, 1200), 3600);
  const startTime = performance.now();
  const length = finalText.length;

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    let output = '';
    for (let i = 0; i < length; i++) {
      const revealPoint = (i / length) * 0.85;
      if (finalText[i] === ' ' || progress > revealPoint) {
        output += finalText[i];
      } else {
        output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
    }
    el.textContent = output;
    if (progress < 1) requestAnimationFrame(frame);
    else el.textContent = finalText;
  }

  requestAnimationFrame(frame);
}

// ===================== Scramble on load (above-the-fold text) =====================
// [data-scramble] pieces inside a .reveal element are handled by the
// IntersectionObserver in setupReveal(); anything marked [data-scramble-load]
// is above the fold and just decodes in once, right after the boot overlay.
function setupScrambleOnLoad() {
  document.querySelectorAll('[data-scramble-load]').forEach((el) => {
    scrambleText(el, el.textContent.trim());
  });
}

// ===================== Custom cursor =====================
// Skipped on touch devices — there's no pointer to reticle-ify.
function setupCustomCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.body.classList.add('custom-cursor-active');

  const dot = document.createElement('div');
  dot.className = 'custom-cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'custom-cursor-ring';
  document.body.append(dot, ring);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });

  window.addEventListener('pointerleave', () => {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });

  // The ring deliberately trails the raw pointer position a touch so it
  // doesn't feel robotic, but the OS cursor is hidden entirely (cursor:
  // none) so this ring is the only visual feedback people get — at a low
  // catch-up rate that reads as sluggish/"weighted" instead of smooth,
  // especially on fast swipes. 0.55 still rounds off the motion slightly
  // but converges in 2-3 frames instead of 8-10.
  function loop() {
    ringX += (mouseX - ringX) * 0.55;
    ringY += (mouseY - ringY) * 0.55;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  const hoverTargets = 'a, button, .btn, .device, .gallery-card, .skill-block, .feature-card, .contact-link, .project-card, .ghost-card';
  document.querySelectorAll(hoverTargets).forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('cursor-hover'));
  });
}

// ===================== 3D tilt on cards =====================
function setupTilt() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const els = document.querySelectorAll('.project-card, .skill-block, .feature-card, .gallery-card');
  els.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 5;
      const rotateX = -((y - rect.height / 2) / (rect.height / 2)) * 5;
      el.style.transition = 'transform 0.1s ease';
      el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.015)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.5s ease';
      el.style.transform = '';
    });
  });
}

// ===================== Magnetic buttons =====================
function setupMagneticButtons() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.btn').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transition = 'transform 0.1s ease';
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.35 - 2}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = '';
    });
  });
}

// ===================== Backgrounds: orbit + light-cycle grid battle =====================
// Two selectable backgrounds, toggled from the header button:
//  - the light-cycle grid battle (bots dueling on a grid, and the base for
//    the secret playable game triggered from the footer)
//  - the older rotating orbit/radar display
// Both are built as small controller objects ({ show, hide, ... }) so they
// can be freely swapped without re-creating DOM each time.
let gridEngine = null;
let orbitEngine = null;
let activeBackground = null; // 'lightcycle' | 'orbit'

function createOrbitBackground() {
  const wrap = document.createElement('div');
  wrap.className = 'orbit-bg';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <div class="orbit-sweep"></div>
    <svg viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
      <g class="orbit-ring orbit-ring-outer">
        <circle cx="400" cy="400" r="380"></circle>
        <circle cx="400" cy="400" r="360" stroke-dasharray="2 16"></circle>
      </g>
      <g class="orbit-ring orbit-ring-mid">
        <circle cx="400" cy="400" r="270" stroke-dasharray="1 10"></circle>
        <circle cx="400" cy="400" r="250"></circle>
      </g>
      <g class="orbit-ring orbit-ring-inner">
        <circle cx="400" cy="400" r="150"></circle>
        <line x1="400" y1="20" x2="400" y2="70"></line>
        <line x1="400" y1="730" x2="400" y2="780"></line>
        <line x1="20" y1="400" x2="70" y2="400"></line>
        <line x1="730" y1="400" x2="780" y2="400"></line>
      </g>
    </svg>
  `;
  return {
    show() { if (!wrap.isConnected) document.body.prepend(wrap); },
    hide() { if (wrap.isConnected) wrap.remove(); },
  };
}

// A real grid-battle simulation, not just decorative trails: each runner
// leaves a solid wall behind it that persists for the whole round. Runners
// die on hitting a wall (their own, an opponent's, or the arena boundary)
// or on a head-on collision with another runner. Last one standing (or a
// mutual wipeout) ends the round; the board clears and a new one begins.
// Also doubles as the secret playable game: one "bot" can be handed off to
// keyboard control (see beginPrompt/beginCountdown below) without changing
// any of the underlying simulation or collision logic.
function createGridEngine() {
  const canvas = document.createElement('canvas');
  canvas.className = 'lightcycle-bg';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');

  const CELL = 22;
  const TICK_MS = 95;
  const ROUND_PAUSE_MS = 1600;
  const MAX_ROUND_TICKS = 500; // safety net so a round can't stall forever
  const FLOOD_LIMIT = 80; // how far each bot "looks" when judging open space
  const PREDICT_AHEAD = 4; // cells to project an opponent forward when targeting it
  const CUTOFF_LEAD = 7; // cells down a target's own lane a cutsOff bot aims to beat them to
  const CUTOFF_ENGAGE_RANGE = 20; // only commit to a cutoff run this close in; otherwise just close distance normally
  const DANGER_SPACE_THRESHOLD = 22; // base danger threshold, scaled per-bot by dangerMultiplier
  const ESCAPE_AGGRESSION_CUT = 0.2; // aggression is throttled to this fraction in escape mode
  const COLLISION_RISK_PENALTY = 35; // deterrent for stepping into an opponent's likely next cell
  const COUNTDOWN_SECONDS = 3;
  const COLORS = ['#37f4ff', '#7c6bff', '#ffb84d', '#2b6bff'];

  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const TURNS = { up: ['left', 'right'], down: ['left', 'right'], left: ['up', 'down'], right: ['up', 'down'] };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  // Four fixed personalities, one per color slot, so the same color always
  // plays the same way round to round. Each trait is a [low, high] range —
  // still some run-to-run variance within a personality, just bounded to a
  // range that reads as that character rather than fully random.
  //   aggression      — how hard it weighs closing distance on a target
  //   dangerMultiplier— scales the "am I cornered" threshold; higher = backs
  //                     off from a chase sooner, lower = pushes its luck
  //   straightBonus   — preference for continuing straight vs. opportunistic
  //                     turning; low values read as weaving/erratic
  //   mistakeChance   — per-tick odds of taking the second-best safe option
  //                     instead of the best one, purely for human fallibility
  //   cutsOff          — movie-style riders: instead of just closing distance
  //                     on a target, they aim for a point well down the
  //                     target's own lane and race to beat them there, so
  //                     their trail lands across the target's path instead
  //                     of trailing behind it.
  const PERSONALITIES = [
    { name: 'HUNTER', aggression: [1.9, 2.3], dangerMultiplier: [0.75, 0.9], straightBonus: [2, 3], mistakeChance: [0.02, 0.035], cutsOff: true },
    { name: 'STALKER', aggression: [1.4, 1.8], dangerMultiplier: [1.0, 1.2], straightBonus: [3.5, 5], mistakeChance: [0.005, 0.015], cutsOff: true },
    { name: 'DRIFTER', aggression: [0.9, 1.3], dangerMultiplier: [0.9, 1.1], straightBonus: [0.5, 1.5], mistakeChance: [0.04, 0.06], cutsOff: false },
    { name: 'GUARDIAN', aggression: [0.5, 0.8], dangerMultiplier: [1.3, 1.6], straightBonus: [3, 4.5], mistakeChance: [0.005, 0.015], cutsOff: false },
  ];
  const pickInRange = ([lo, hi]) => lo + Math.random() * (hi - lo);

  let cols = 0;
  let rows = 0;
  let grid = [];
  let bots = [];
  let effects = [];
  let roundTicks = 0;
  let running = false; // is the canvas mounted/active at all
  let paused = false; // frozen between rounds, or during a prompt/countdown
  let dpr = Math.max(window.devicePixelRatio || 1, 1);
  let tickHandle = null;
  let tickRunning = false;
  let rafRunning = false;
  let resizeHandle = null;

  let mode = 'ambient'; // 'ambient' | 'prompt' | 'countdown' | 'playing' | 'gameover'
  let playerId = null;
  let pendingDir = null;
  let onHudUpdate = null;

  const inBounds = (x, y) => x >= 0 && x < cols && y >= 0 && y < rows;
  const isFree = (x, y) => inBounds(x, y) && !grid[y][x];

  function makeGrid() {
    grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
  }

  function spawnBot(id, color, x, y, dir) {
    const p = PERSONALITIES[id % PERSONALITIES.length];
    return {
      id,
      color,
      x,
      y,
      dir,
      alive: true,
      trail: [{ x, y }],
      personality: p.name,
      aggression: pickInRange(p.aggression),
      dangerMultiplier: pickInRange(p.dangerMultiplier),
      straightBonus: pickInRange(p.straightBonus),
      mistakeChance: pickInRange(p.mistakeChance),
      cutsOff: p.cutsOff,
    };
  }

  function randomSpawn(id, color) {
    // Start somewhere with breathing room, not jammed against an edge.
    const margin = 4;
    const x = margin + Math.floor(Math.random() * Math.max(cols - margin * 2, 1));
    const y = margin + Math.floor(Math.random() * Math.max(rows - margin * 2, 1));
    const dir = Object.keys(DIRS)[Math.floor(Math.random() * 4)];
    return spawnBot(id, color, x, y, dir);
  }

  // The four starting points form a "+" around the arena center, out on
  // the tips of each arm — but every runner faces back inward, so the
  // moment the countdown ends all four converge on the middle instead of
  // riding out to the walls first.
  function crossSpawn(id, color, armDir) {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const arm = Math.max(Math.min(Math.floor(Math.min(cols, rows) / 2) - 3, 18), 6);
    const d = DIRS[armDir];
    return spawnBot(id, color, cx + d.x * arm, cy + d.y * arm, OPPOSITE[armDir]);
  }

  function resize() {
    // window.innerWidth/innerHeight include the scrollbar's own width when
    // one is rendered, so sizing the canvas off those numbers made it
    // consistently wider/taller than the actual visible content area
    // whenever a scrollbar showed up -- pushing part of the grid (and any
    // bot that wandered into it) behind/off past the scrollbar. clientWidth/
    // clientHeight on the root element exclude the scrollbar, so the canvas
    // now always matches exactly what's actually visible.
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    dpr = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = viewportWidth * dpr;
    canvas.height = viewportHeight * dpr;
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(viewportWidth / CELL);
    rows = Math.ceil(viewportHeight / CELL);
  }

  function startAmbientRound() {
    makeGrid();
    effects = [];
    roundTicks = 0;
    paused = false;
    mode = 'ambient';
    playerId = null;
    bots = COLORS.map((color, i) => randomSpawn(i, color));
    bots.forEach((b) => { grid[b.y][b.x] = b.id + 1; });
    draw();
  }

  function startCrossFormation() {
    makeGrid();
    effects = [];
    roundTicks = 0;
    const armDirs = ['up', 'down', 'left', 'right'];
    bots = COLORS.map((color, i) => crossSpawn(i, color, armDirs[i]));
    bots.forEach((b) => { grid[b.y][b.x] = b.id + 1; });
    playerId = 0; // the "up" arm becomes the player-controlled runner
    pendingDir = bots[0].dir;
    draw();
  }

  function reset() {
    resize();
    startAmbientRound();
  }

  // Bounded flood-fill from a candidate cell — how much open space does
  // committing to this move actually leave the bot? This is what stops
  // bots from coiling into their own trail: a move that looks fine one
  // step ahead but boxes them into a small pocket scores low here and
  // gets passed over in favor of a direction with real room to move.
  function floodFillSpace(startX, startY, limit) {
    if (!isFree(startX, startY)) return 0;
    const visited = new Set([`${startX},${startY}`]);
    const queue = [[startX, startY]];
    let count = 0;
    while (queue.length && count < limit) {
      const [cx, cy] = queue.shift();
      count++;
      const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (const [nx, ny] of neighbors) {
        const key = `${nx},${ny}`;
        if (!visited.has(key) && isFree(nx, ny)) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
    return count;
  }

  // Aim a little ahead of the nearest opponent's current heading rather
  // than straight at them, so bots read as trying to cut a path off
  // instead of just tailgating. During the playable game, the player is
  // just another entry in `alive`, so bots hunt it exactly the same way.
  function nearestTarget(bot, alive) {
    let best = null;
    let bestDist = Infinity;
    let nearestRaw = Infinity;
    alive.forEach((other) => {
      if (other === bot) return;
      const rawDist = Math.abs(other.x - bot.x) + Math.abs(other.y - bot.y);
      if (rawDist < nearestRaw) nearestRaw = rawDist;

      const ahead = DIRS[other.dir];
      const tx = other.x + ahead.x * PREDICT_AHEAD;
      const ty = other.y + ahead.y * PREDICT_AHEAD;
      const dist = Math.abs(tx - bot.x) + Math.abs(ty - bot.y);
      if (dist < bestDist) { bestDist = dist; best = { x: tx, y: ty }; }
    });

    // Movie-style riders don't just tail the nearest bike — once they're
    // close enough to actually make the run, they aim for a point well
    // down the target's own lane and race to plant a wall across it,
    // cutting the target off instead of following behind them.
    if (bot.cutsOff && nearestRaw <= CUTOFF_ENGAGE_RANGE) {
      let cutBest = null;
      let cutBestDist = Infinity;
      alive.forEach((other) => {
        if (other === bot) return;
        const ahead = DIRS[other.dir];
        const tx = other.x + ahead.x * CUTOFF_LEAD;
        const ty = other.y + ahead.y * CUTOFF_LEAD;
        const dist = Math.abs(tx - bot.x) + Math.abs(ty - bot.y);
        if (dist < cutBestDist) { cutBestDist = dist; cutBest = { x: tx, y: ty }; }
      });
      if (cutBest) return cutBest;
    }

    return best;
  }

  // Every tick, for every bot: look at each direction it could actually
  // turn to (straight, or either perpendicular turn — reversing isn't an
  // option) and flood-fill from there to see how much open room that
  // choice actually leaves. This is the "where am I, where are the walls"
  // check, done properly — a straight-line ray only tells you the nearest
  // wall in one direction, but a corridor that's wide for 3 cells and then
  // dead-ends still reads as "close" either way, so the read has to be
  // area-based to catch real trap risk instead of just nearby clutter.
  function chooseDirection(bot, alive) {
    const candidateDirs = [bot.dir, ...TURNS[bot.dir]];
    const target = nearestTarget(bot, alive);

    const options = candidateDirs
      .map((dir) => {
        const d = DIRS[dir];
        const nx = bot.x + d.x;
        const ny = bot.y + d.y;
        if (!isFree(nx, ny)) return null;
        return { dir, nx, ny, space: floodFillSpace(nx, ny, FLOOD_LIMIT) };
      })
      .filter(Boolean);

    if (!options.length) return bot.dir;

    const maxSpace = Math.max(...options.map((o) => o.space));
    const inDanger = maxSpace < DANGER_SPACE_THRESHOLD * bot.dangerMultiplier;
    const aggressionScale = inDanger ? ESCAPE_AGGRESSION_CUT : 1;

    // Naive one-tick lookahead for every other rider, assuming they keep
    // going straight. Not always true, but it's what a real player reads
    // off an opponent's heading — enough to flinch away from a cell two
    // bots are both about to plow into instead of only noticing after
    // they're both dead. Cautious personalities weigh this heavily;
    // reckless ones (high aggression) still shrug and take the trade.
    const incoming = alive
      .filter((o) => o !== bot)
      .map((o) => {
        const d = DIRS[o.dir];
        return { x: o.x + d.x, y: o.y + d.y };
      });

    const scored = options.map(({ dir, nx, ny, space }) => {
      let score = space;
      if (dir === bot.dir) score += bot.straightBonus;
      if (target) {
        const dist = Math.abs(target.x - nx) + Math.abs(target.y - ny);
        score -= dist * bot.aggression * aggressionScale;
      }
      const headOnRisk = incoming.some((p) => p.x === nx && p.y === ny);
      if (headOnRisk) score -= COLLISION_RISK_PENALTY / bot.aggression;
      score += Math.random() * 0.5; // light jitter so ties don't look robotic
      return { dir, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Rare, personality-scaled misjudgment: take the second-best safe
    // option instead of the actual best one. It's still a live, reasonable
    // choice — never one of the moves that were already filtered out for
    // being an immediate crash — just not the optimal one, the way a
    // person might second-guess a call under pressure.
    if (scored.length > 1 && Math.random() < bot.mistakeChance) {
      return scored[1].dir;
    }

    return scored[0].dir;
  }

  function triggerCrash(x, y, color) {
    effects.push({ x, y, color, start: performance.now() });
  }

  function resolveTick() {
    roundTicks++;
    const alive = bots.filter((b) => b.alive);

    if (mode === 'playing') {
      const player = bots.find((b) => b.id === playerId);
      const playerAlive = player && player.alive;
      const opponentsLeft = alive.filter((b) => b.id !== playerId).length;
      if (!playerAlive) { endGame('lost'); return; }
      if (opponentsLeft === 0) { endGame('won'); return; }
      if (roundTicks > MAX_ROUND_TICKS) { endGame('won'); return; }
    } else if (alive.length <= 1 || roundTicks > MAX_ROUND_TICKS) {
      const winner = alive[0];
      if (winner) triggerCrash(winner.x, winner.y, winner.color); // small flourish, not a death
      paused = true;
      draw();
      setTimeout(startAmbientRound, ROUND_PAUSE_MS);
      return;
    }

    // Decide moves from current grid state, then resolve all at once so
    // order doesn't matter and simultaneous head-ons are caught correctly.
    const moves = alive.map((b) => {
      let dir;
      if (mode === 'playing' && b.id === playerId) {
        dir = pendingDir && pendingDir !== OPPOSITE[b.dir] ? pendingDir : b.dir;
      } else {
        dir = chooseDirection(b, alive);
      }
      const d = DIRS[dir];
      return { bot: b, dir, nx: b.x + d.x, ny: b.y + d.y };
    });

    moves.forEach((m) => {
      const dead =
        !inBounds(m.nx, m.ny) ||
        (grid[m.ny] && grid[m.ny][m.nx]) ||
        moves.some((other) => other !== m && other.nx === m.nx && other.ny === m.ny);

      if (dead) {
        m.bot.alive = false;
        triggerCrash(m.bot.x, m.bot.y, m.bot.color);
        return;
      }

      m.bot.dir = m.dir;
      m.bot.x = m.nx;
      m.bot.y = m.ny;
      m.bot.trail.push({ x: m.nx, y: m.ny });
      grid[m.ny][m.nx] = m.bot.id + 1;
    });

    draw();
  }

  function tick() {
    if (paused || !running) return;
    resolveTick();
  }

  const TRAIL_RECENT = 12; // segments this close to the head render fully opaque

  function pathThrough(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x * CELL + CELL / 2, points[0].y * CELL + CELL / 2);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * CELL + CELL / 2, points[i].y * CELL + CELL / 2);
    }
    ctx.stroke();
  }

  function drawTrail(bot) {
    // A trail can grow to hundreds of segments over a round, and this used
    // to issue one full beginPath/moveTo/lineTo/stroke per segment, every
    // single redraw -- real per-frame cost that only got worse as a round
    // went on, enough to visibly stall the main thread (and anything else
    // running on it, like cursor tracking). Batches the same fade look
    // into at most two stroke() calls instead: one path for the dimmer
    // older stretch, one for the fully-opaque recent stretch.
    const trail = bot.trail;
    if (trail.length < 2) return;
    ctx.strokeStyle = bot.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'round';

    const splitIndex = Math.max(trail.length - TRAIL_RECENT, 0);
    if (splitIndex > 0) {
      ctx.globalAlpha = 0.55;
      pathThrough(trail.slice(0, splitIndex + 1));
    }
    ctx.globalAlpha = 1;
    pathThrough(trail.slice(splitIndex));
  }

  function drawHead(bot) {
    if (!bot.alive) return;
    const cx = bot.x * CELL + CELL / 2;
    const cy = bot.y * CELL + CELL / 2;
    const horizontal = bot.dir === 'left' || bot.dir === 'right';
    const w = horizontal ? CELL * 0.55 : CELL * 0.32;
    const h = horizontal ? CELL * 0.32 : CELL * 0.55;
    ctx.fillStyle = bot.color;
    ctx.shadowColor = bot.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.shadowBlur = 0;
    if (bot.id === playerId) {
      // A bright outline so the player's own runner is easy to pick out
      // from the AI ones at a glance.
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.strokeRect(cx - w / 2 - 3, cy - h / 2 - 3, w + 6, h + 6);
      ctx.globalAlpha = 1;
    }
  }

  function drawPlayerMarker(now) {
    // The white outline on the player's head helps up close, but at a
    // glance during a live match it's easy to lose track of which runner
    // is yours. This drops a bobbing "YOU" arrow right over it whenever
    // the player bike exists on screen — set up, countdown, and live play.
    if (mode !== 'prompt' && mode !== 'countdown' && mode !== 'playing') return;
    const player = bots.find((b) => b.id === playerId);
    if (!player || !player.alive) return;

    const cx = player.x * CELL + CELL / 2;
    const cy = player.y * CELL + CELL / 2;
    const bob = Math.sin(now / 260) * 4;
    const tipY = cy - CELL * 1.4 + bob;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 10;
    ctx.fillText('YOU', cx, tipY - 12);

    ctx.beginPath();
    ctx.moveTo(cx - 7, tipY - 4);
    ctx.lineTo(cx + 7, tipY - 4);
    ctx.lineTo(cx, tipY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEffects(now) {
    const DURATION = 550;
    effects = effects.filter((fx) => now - fx.start < DURATION);
    effects.forEach((fx) => {
      const t = (now - fx.start) / DURATION;
      const cx = fx.x * CELL + CELL / 2;
      const cy = fx.y * CELL + CELL / 2;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + t * CELL * 1.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.6;
      ctx.fillStyle = fx.color;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(6 - t * 6, 0), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, document.documentElement.clientWidth, document.documentElement.clientHeight);
    bots.forEach(drawTrail);
    bots.forEach(drawHead);
    const now = performance.now();
    drawEffects(now);
    drawPlayerMarker(now);
  }

  function startTickLoop() {
    if (tickRunning) return;
    tickRunning = true;
    clearInterval(tickHandle);
    tickHandle = setInterval(tick, TICK_MS);
  }

  function stopTickLoop() {
    tickRunning = false;
    clearInterval(tickHandle);
  }

  function startRafLoop() {
    if (rafRunning) return;
    rafRunning = true;
    (function raf() {
      if (!running) { rafRunning = false; return; }
      // Keep redrawing through crash effects, and through the paused
      // prompt/countdown screens too so the "YOU" marker still bobs while
      // players wait to launch instead of sitting frozen.
      if (effects.length || mode === 'prompt' || mode === 'countdown') draw();
      requestAnimationFrame(raf);
    })();
  }

  window.addEventListener('resize', () => {
    clearTimeout(resizeHandle);
    resizeHandle = setTimeout(() => { if (running) reset(); }, 200);
  });

  // ---------- Public lifecycle ----------
  function show() {
    running = true;
    if (!canvas.isConnected) document.body.prepend(canvas);
    resize();
    if (bots.length === 0) startAmbientRound();
    else draw();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      startTickLoop();
      startRafLoop();
    }
  }

  function hide() {
    running = false;
    stopTickLoop();
    if (mode !== 'ambient') { mode = 'ambient'; onHudUpdate = null; }
    if (canvas.isConnected) canvas.remove();
  }

  // ---------- Secret-game control (used by setupSecretGame) ----------
  function beginPrompt(onUpdate) {
    onHudUpdate = onUpdate;
    mode = 'prompt';
    paused = true;
    startCrossFormation();
    draw();
    if (!tickRunning) startTickLoop(); // gameplay needs ticking even under reduced-motion
    onHudUpdate({ state: 'prompt' });
  }

  function beginCountdown() {
    if (mode !== 'prompt') return;
    mode = 'countdown';
    let n = COUNTDOWN_SECONDS;
    onHudUpdate && onHudUpdate({ state: 'countdown', value: n });
    const step = () => {
      n--;
      if (n > 0) {
        onHudUpdate && onHudUpdate({ state: 'countdown', value: n });
        setTimeout(step, 1000);
      } else {
        beginPlaying();
      }
    };
    setTimeout(step, 1000);
  }

  function beginPlaying() {
    mode = 'playing';
    roundTicks = 0;
    paused = false;
    onHudUpdate && onHudUpdate({ state: 'playing' });
  }

  function endGame(result) {
    mode = 'gameover';
    paused = true;
    draw();
    onHudUpdate && onHudUpdate({ state: 'gameover', result });
    setTimeout(() => {
      onHudUpdate = null;
      startAmbientRound();
    }, 2600);
  }

  function abortGame() {
    onHudUpdate = null;
    startAmbientRound();
  }

  function setPlayerDirection(dir) {
    pendingDir = dir;
  }

  return {
    show,
    hide,
    beginPrompt,
    beginCountdown,
    abortGame,
    setPlayerDirection,
    get mode() { return mode; },
  };
}

function setupBackgroundToggle() {
  const btn = document.getElementById('bgToggle');
  if (!btn || !gridEngine || !orbitEngine) return;

  function apply(next, persist) {
    activeBackground = next;
    if (next === 'lightcycle') {
      orbitEngine.hide();
      gridEngine.show();
      btn.setAttribute('aria-pressed', 'true');
    } else {
      gridEngine.hide();
      orbitEngine.show();
      btn.setAttribute('aria-pressed', 'false');
    }
    // Fade the page content itself when Tron mode is on, so the grid
    // battle underneath is actually visible (and playable) instead of
    // being hidden behind solid text/panels. Hovering a section brings
    // it back to full opacity to read it — see the CSS for the transition.
    document.body.classList.toggle('bg-lightcycle', next === 'lightcycle');
    if (persist) {
      try { localStorage.setItem('bgMode', next); } catch (e) {}
    }
  }

  let saved = null;
  try { saved = localStorage.getItem('bgMode'); } catch (e) {}
  apply(saved === 'orbit' ? 'orbit' : 'lightcycle', false);

  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    apply(activeBackground === 'lightcycle' ? 'orbit' : 'lightcycle', true);
  });
}

// ===================== Secret playable light-cycle game =====================
function setupSecretGame() {
  const trigger = document.getElementById('secretTrigger');
  if (!trigger || !gridEngine) return;

  const bgToggleBtn = document.getElementById('bgToggle');
  const hud = document.createElement('div');
  hud.className = 'game-hud';
  hud.setAttribute('aria-hidden', 'true');
  document.body.appendChild(hud);

  let active = false;

  function renderHud(state) {
    if (state.state === 'prompt') {
      hud.innerHTML = '<div class="game-hud-prompt">PRESS ANY BUTTON TO START</div>'
        + '<div class="game-hud-hint">WASD TO MOVE &middot; ESC TO EXIT</div>';
      hud.classList.add('visible');
    } else if (state.state === 'countdown') {
      hud.innerHTML = `<div class="game-hud-countdown">${state.value}</div>`;
    } else if (state.state === 'playing') {
      hud.innerHTML = '<div class="game-hud-hint">WASD TO MOVE &middot; ESC TO EXIT</div>';
    } else if (state.state === 'gameover') {
      const msg = state.result === 'won' ? 'YOU SURVIVED' : 'DERESOLVED';
      hud.innerHTML = `<div class="game-hud-result">${msg}</div>`;
      setTimeout(() => {
        hud.classList.remove('visible');
        active = false;
        if (bgToggleBtn) bgToggleBtn.disabled = false;
        window.removeEventListener('keydown', onKey);
      }, 2200);
    }
  }

  function exitGame() {
    active = false;
    if (bgToggleBtn) bgToggleBtn.disabled = false;
    window.removeEventListener('keydown', onKey);
    hud.classList.remove('visible');
    gridEngine.abortGame();
  }

  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (e.key === 'Escape') { exitGame(); return; }

    if (gridEngine.mode === 'prompt') {
      gridEngine.beginCountdown();
      return;
    }

    if (gridEngine.mode === 'playing') {
      const map = { w: 'up', a: 'left', s: 'down', d: 'right' };
      const dir = map[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        gridEngine.setPlayerDirection(dir);
      }
    }
  }

  trigger.addEventListener('click', () => {
    if (active) { exitGame(); return; }
    active = true;

    // The game runs on the light-cycle canvas specifically — force that
    // background on if the orbit display is currently showing.
    if (activeBackground !== 'lightcycle') {
      if (bgToggleBtn) bgToggleBtn.click();
      else { orbitEngine.hide(); gridEngine.show(); activeBackground = 'lightcycle'; }
    }

    if (bgToggleBtn) bgToggleBtn.disabled = true; // no swapping backgrounds mid-game
    window.addEventListener('keydown', onKey);
    gridEngine.beginPrompt(renderHud);
  });
}

function setupBackgrounds() {
  gridEngine = createGridEngine();
  orbitEngine = createOrbitBackground();
  setupBackgroundToggle();
  setupSecretGame();
}

// ===================== Header scroll state =====================
function setupHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const onScroll = () => {
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ===================== Scroll-spy nav =====================
function setupScrollSpy() {
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.main-nav a');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.getAttribute('id');
      const link = document.querySelector(`.main-nav a[data-nav="${id}"]`);
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

  sections.forEach((s) => observer.observe(s));
}

// ===================== Reveal on scroll =====================
function setupReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');

        // Any [data-scramble] text inside (or on) this element decodes in
        // via the same scramble-reveal used by the prescript demo.
        const scrambleTargets = entry.target.hasAttribute('data-scramble')
          ? [entry.target, ...entry.target.querySelectorAll('[data-scramble]')]
          : [...entry.target.querySelectorAll('[data-scramble]')];
        scrambleTargets.forEach((el) => scrambleText(el, el.textContent.trim()));

        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach((item) => observer.observe(item));
}

// ===================== Cursor glow =====================
function setupCursorGlow() {
  const glow = document.querySelector('.cursor-glow');
  if (!glow) return;
  let active = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    glow.style.opacity = '1';
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    active = true;
  });

  window.addEventListener('pointerleave', () => {
    if (active) glow.style.opacity = '0';
  });
}

// ===================== Mobile nav toggle =====================
function setupMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });
}

// ===================== Placeholder link notice =====================
function setupPlaceholderLinks() {
  document.querySelectorAll('[data-placeholder]').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (link.getAttribute('href') === '#') {
        e.preventDefault();
        const which = link.getAttribute('data-placeholder');
        console.info(`[portfolio] Add your ${which} URL in index.html (data-placeholder="${which}").`);
      }
    });
  });
}

// ===================== Live GitHub stats =====================
// Counts a stat block up from 0 to its real value instead of just
// pasting the number in — reads as a live data feed rather than static text.
function animateCount(el, target, duration = 900) {
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(from + (target - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

async function setupGithubStats() {
  const GITHUB_USER = 'GHurley4444';
  const reposEl = document.getElementById('ghRepos');
  const followersEl = document.getElementById('ghFollowers');
  const lastRepoEl = document.getElementById('ghLastRepo');
  if (!reposEl) return;

  try {
    const userRes = await fetch(`https://api.github.com/users/${GITHUB_USER}`);
    if (userRes.ok) {
      const user = await userRes.json();
      if (typeof user.public_repos === 'number') animateCount(reposEl, user.public_repos);
      else reposEl.textContent = '—';
      if (typeof user.followers === 'number') animateCount(followersEl, user.followers);
      else followersEl.textContent = '—';
    }

    const reposRes = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=1`);
    if (reposRes.ok) {
      const repos = await reposRes.json();
      lastRepoEl.textContent = repos && repos[0] ? repos[0].name : 'none yet';
      lastRepoEl.classList.add('flash');
    }
  } catch (e) {
    console.info('[portfolio] GitHub API unavailable right now:', e);
    reposEl.textContent = '—';
    followersEl.textContent = '—';
    lastRepoEl.textContent = '—';
  }
}

// ===================== Email obfuscation =====================
// The address never appears in the page's raw HTML (view-source, curl,
// or any scraper that doesn't execute JS sees a bare "reveal email" link
// with href="#"). It's assembled from split data-attributes and written
// into a real mailto: link once the page loads. Doesn't stop a scraper
// that runs a full headless browser, but that's a small minority of the
// bots harvesting addresses at scale — most just regex raw HTML across
// as many pages as possible as cheaply as possible, and this is invisible
// to that. Real visitors (and screen readers, which read the live DOM
// after this runs) see a completely normal clickable email link.
function setupEmailReveal() {
  const link = document.getElementById('emailLink');
  const valueEl = document.getElementById('emailValue');
  if (!link || !valueEl) return;
  const user = link.dataset.user;
  const domain = link.dataset.domain;
  if (!user || !domain) return;
  const address = `${user}@${domain}`;
  link.href = `mailto:${address}`;
  valueEl.textContent = address;
}

// ===================== Active nav by current page =====================
// Scroll-spy only fires on index.html (the only page with matching section ids).
// On other pages, mark the nav link for the current page active instead.
function setActiveNavByPage() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.main-nav a');
  if (!navLinks.length) return;

  let key = null;
  if (path.startsWith('project-') || path === 'projects.html') key = 'projects';

  if (key) {
    navLinks.forEach((l) => l.classList.remove('active'));
    const link = document.querySelector(`.main-nav a[data-nav="${key}"]`);
    if (link) link.classList.add('active');
  }
}

// ===================== Prescript engine demo (project-beeper.html) =====================
// Real strings lifted from beeper.ino's easy*/*, *Prescripts, hard*, rare* arrays.
const prescriptPools = {
  GAME: {
    easy: ['KILL 5 ENEMIES', 'PICK UP ONE ITEM', 'EXPLORE ONE NEW ROOM', 'RELOAD YOUR WEAPON', 'USE A HEALING ITEM', 'OPEN A CHEST OR CRATE', 'REACH THE NEXT CHECKPOINT', 'READ ONE PIECE OF LORE'],
    normal: ['SURVIVE 10 MINUTES WITHOUT TAKING DAMAGE', 'COMPLETE A MISSION USING ONLY YOUR STARTING LOADOUT', 'FIND AND READ EVERY PIECE OF LORE IN THE CURRENT AREA', 'KILL 20 ENEMIES WITHOUT USING YOUR PRIMARY WEAPON', 'REACH THE NEXT CHECKPOINT WITHOUT SPENDING ANY RESOURCES', 'COMPLETE A FULL RUN WITHOUT DYING', 'HELP A TEAMMATE OR ALLY COMPLETE THEIR OBJECTIVE'],
    hard: ['COMPLETE A FULL RUN ON THE HIGHEST DIFFICULTY WITHOUT DYING ONCE', 'DEFEAT THE FINAL BOSS USING ONLY THE STARTING WEAPON OR LOADOUT', 'FIND AND COLLECT EVERY COLLECTIBLE IN A SINGLE LEVEL OR ZONE', 'COMPLETE A NO-HIT RUN OF AN ENTIRE LEVEL OR ENCOUNTER', 'REACH THE FINAL CHECKPOINT WITHOUT USING ANY HEALING ITEMS'],
  },
  CITY: {
    easy: ['Walk to the nearest window and look outside for 40 seconds.', 'Sit somewhere you have never sat before.', 'Touch something cold.', 'Stand up before you are ready.', 'Drink water before leaving.', 'Find something red and stand next to it.', 'Do not check your phone for the next 20 minutes.'],
    normal: ['If you get wet, pretend everything is normal and do not use the bathroom for 3 hours.', 'Take the train.', 'Do not speak for 2 hours. If asked why, write the word PROTOCOL on your hand and show it.', 'Walk to the nearest body of water. Touch it. Leave without looking back.', 'Find a phone booth or any enclosed standing space. Stand in it for exactly 9 minutes.', 'Find something you lost. If you cannot, lose something on purpose.'],
    hard: ['For 24 hours, do not enter any building you have been in before. This includes your home.', 'Before the day ends, sleep somewhere you have never slept. This counts as a nap.', 'Do not use any form of digital communication for 6 hours. Begin now.', 'For 48 hours, do not sit in the same chair twice.', 'Write a letter to someone. Send it by post. Do not tell them to expect it.'],
  },
  CON: {
    easy: ['COMPLIMENT ONE COSPLAYER', 'TAKE A PHOTO OF SOMETHING YOU LIKE', 'FIND SOMEWHERE TO SIT AND REST', 'DRINK WATER', 'LOOK FOR ONE LED COSTUME', 'FIND SOMEONE WEARING A CAPE', 'OBSERVE ONE PROP WITHOUT TOUCHING IT'],
    normal: ['FIND A COSPLAYER WITH WINGS AND ASK FOR A PHOTO', 'LOCATE SOMEONE COSPLAYING A CHARACTER FROM A GAME YOU RECOGNIZE', 'COMPLIMENT THREE DIFFERENT COSPLAYERS', 'FIND A PROP WEAPON LARGER THAN YOUR ARM', 'ASK SOMEONE WHAT THEIR FAVORITE PANEL HAS BEEN'],
    hard: ['APPROACH A GROUP COSPLAY AND IDENTIFY EVERY CHARACTER IN IT', 'ATTEND A PANEL ON A TOPIC YOU KNOW NOTHING ABOUT AND TAKE NOTES', 'FIND THREE COSPLAYERS FROM SERIES YOU NEVER HEARD OF AND ASK ABOUT THEM', 'COMPLETE A FULL LAP OF THE CONVENTION FLOOR WITHOUT YOUR PHONE', 'FIND THE MOST TECHNICALLY IMPRESSIVE PROP AND LEARN HOW IT WAS MADE'],
  },
  TASK: {
    easy: ['CLOSE ONE APP YOU ARE NOT USING', 'RESPOND TO ONE MESSAGE', 'WRITE ONE ITEM ON YOUR TO DO LIST', 'DRINK WATER BEFORE CONTINUING', 'PUT YOUR PHONE FACE DOWN FOR ONE MINUTE', 'STAND AND STRETCH ONCE', 'TAKE THREE DEEP BREATHS'],
    normal: ['GO OUTSIDE FOR FIVE MINUTES', 'DRINK WATER BEFORE USING YOUR PHONE AGAIN', 'CLEAN ONE SMALL AREA COMPLETELY', 'WRITE DOWN THREE THINGS YOU NEED TO DO TODAY'],
    hard: ['COMPLETE THE SINGLE HARDEST ITEM ON YOUR TASK LIST TODAY', 'AUDIT YOUR ENTIRE TO DO LIST AND ELIMINATE ANYTHING NON ESSENTIAL', 'WORK FOR FORTY FIVE MINUTES WITHOUT TOUCHING YOUR PHONE', 'WRITE A CLEAR PLAN FOR THE NEXT WEEK WITH DAILY GOALS', 'CLEAR YOUR INBOX TO ZERO BEFORE CONTINUING ANY OTHER TASK'],
  },
};

const rarePools = {
  GAME: ['THE SYSTEM HAS FLAGGED AN ANOMALY IN YOUR ROUTINE. IDENTIFY IT', 'A THREAD HAS COME LOOSE. FIND IT BEFORE IT UNRAVELS FURTHER', 'SOMETHING IN YOUR ENVIRONMENT IS WATCHING YOU WAIT. STOP WAITING', 'THE RECORD SHOWS YOU HAVE DONE THIS BEFORE. DO IT DIFFERENTLY THIS TIME', 'AN UNRESOLVED ITEM IS ACCUMULATING WEIGHT. NAME IT OUT LOUD', 'LOCATE THE TASK YOU ARE MOST AFRAID TO START AND OPEN IT'],
  CITY: ['FOLLOW THE PERSON WHO LOOKS LIKE THEY KNOW SOMETHING YOU DO NOT', 'FIND THE DOOR THAT DOES NOT MATCH ITS BUILDING AND STAND BEFORE IT', 'THERE IS A LIGHT ON IN A WINDOW THAT SHOULD BE EMPTY. LOCATE IT', 'A SOUND DOES NOT BELONG TO THIS STREET. TRACE IT TO ITS ORIGIN', 'FIND THE PLACE WHERE THE CITY FORGOT TO FINISH ITSELF'],
  CON: ['FIND THE COSPLAYER WHO DOES NOT BELONG TO ANY FANDOM YOU RECOGNIZE', 'LOCATE THE BOOTH THAT SHOULD NOT EXIST ON THE FLOOR PLAN', 'FIND THE ONE PERSON IN THE CROWD WHO IS COMPLETELY STILL', 'A PROP IN THIS VENUE IS NOT A PROP. YOU WILL KNOW IT WHEN YOU SEE IT', 'IDENTIFY THE EXIT THAT WAS NOT THERE AN HOUR AGO'],
  TASK: ['YOUR MOST PRODUCTIVE HOUR TODAY HAS ALREADY PASSED. RECOVER WHAT YOU CAN', 'DELETE SOMETHING YOU HAVE BEEN KEEPING FOR REASONS YOU CANNOT EXPLAIN', 'WRITE DOWN THE TASK YOU KEEP MOVING TO TOMORROW. IT IS DUE NOW', 'THE FILE YOU NEED IS NOT LOST. YOU MOVED IT. FIND IT', 'SIT DOWN AND DO THE THING. THE PREPARATION IS ALREADY DONE'],
};

const TIERS = ['easy', 'normal', 'hard'];
const TIER_LABELS = { easy: 'EASY', normal: 'NORM', hard: 'HARD' };
const CATEGORY_ORDER = ['GAME', 'CITY', 'CON', 'TASK', 'TIMED'];
const TIMED_SECONDS = 20;

function setupPrescriptDemo() {
  const device = document.getElementById('demoDevice');
  if (!device) return;

  const labelEl = document.getElementById('demoLabel');
  const diffEl = document.getElementById('demoDiff');
  const streakEl = document.getElementById('demoStreak');
  const textEl = document.getElementById('demoText');
  const prevEl = document.getElementById('demoPrev');
  const nextEl = document.getElementById('demoNext');
  const passEl = document.getElementById('demoPass');
  const failEl = document.getElementById('demoFail');

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let lastRenderedText = null;

  const state = {
    index: 0,
    cats: {
      GAME: { tier: 'easy', streak: 0, text: null },
      CITY: { tier: 'easy', streak: 0, text: null },
      CON: { tier: 'easy', streak: 0, text: null },
      TASK: { tier: 'easy', streak: 0, text: null },
    },
    timed: { text: null, secondsLeft: TIMED_SECONDS, timerId: null },
  };

  const currentCategory = () => CATEGORY_ORDER[state.index];
  const neighbor = (offset) => {
    const n = CATEGORY_ORDER.length;
    return CATEGORY_ORDER[(state.index + offset + n) % n];
  };

  function clearTimedTimer() {
    if (state.timed.timerId) {
      clearInterval(state.timed.timerId);
      state.timed.timerId = null;
    }
  }

  function allRare() {
    return [...rarePools.GAME, ...rarePools.CITY, ...rarePools.CON, ...rarePools.TASK];
  }

  function startTimed() {
    clearTimedTimer();
    state.timed.text = pick(allRare());
    state.timed.secondsLeft = TIMED_SECONDS;
    state.timed.timerId = setInterval(() => {
      state.timed.secondsLeft--;
      if (state.timed.secondsLeft <= 0) {
        state.timed.text = pick(allRare());
        state.timed.secondsLeft = TIMED_SECONDS;
      }
      if (currentCategory() === 'TIMED') render();
    }, 1000);
  }

  function ensureLoaded(cat) {
    const s = state.cats[cat];
    if (!s.text) s.text = pick(prescriptPools[cat][s.tier]);
  }

  function render() {
    const cat = currentCategory();
    labelEl.textContent = cat;
    prevEl.textContent = `< ${neighbor(-1)}`;
    nextEl.textContent = `${neighbor(1)} >`;

    let taskText;
    if (cat === 'TIMED') {
      const secs = String(Math.max(state.timed.secondsLeft, 0)).padStart(2, '0');
      diffEl.textContent = `⏱ 0:${secs}`;
      streakEl.textContent = 'RARE PULL';
      taskText = state.timed.text;
    } else {
      ensureLoaded(cat);
      const s = state.cats[cat];
      diffEl.textContent = `[${TIER_LABELS[s.tier]} ${s.streak}]`;
      streakEl.textContent = `s:${s.streak}`;
      taskText = s.text;
    }

    if (taskText !== lastRenderedText) {
      scrambleText(textEl, taskText);
      lastRenderedText = taskText;
    }
  }

  function handlePass() {
    const cat = currentCategory();
    if (cat === 'TIMED') { startTimed(); render(); return; }
    const s = state.cats[cat];
    s.streak++;
    const tierIdx = TIERS.indexOf(s.tier);
    if (s.streak % 2 === 0 && tierIdx < TIERS.length - 1) s.tier = TIERS[tierIdx + 1];
    s.text = pick(prescriptPools[cat][s.tier]);
    render();
  }

  function handleFail() {
    const cat = currentCategory();
    if (cat === 'TIMED') { startTimed(); render(); return; }
    const s = state.cats[cat];
    s.streak = 0;
    s.tier = 'easy';
    s.text = pick(prescriptPools[cat][s.tier]);
    render();
  }

  function handlePrev() {
    state.index = (state.index - 1 + CATEGORY_ORDER.length) % CATEGORY_ORDER.length;
    if (currentCategory() === 'TIMED') startTimed(); else clearTimedTimer();
    render();
  }

  function handleNext() {
    state.index = (state.index + 1) % CATEGORY_ORDER.length;
    if (currentCategory() === 'TIMED') startTimed(); else clearTimedTimer();
    render();
  }

  prevEl.addEventListener('click', handlePrev);
  nextEl.addEventListener('click', handleNext);
  passEl.addEventListener('click', handlePass);
  failEl.addEventListener('click', handleFail);

  render();
}

// ===================== Footer year =====================
function setupFooterYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

// ===================== Init =====================
document.addEventListener('DOMContentLoaded', () => {
  setupBackgrounds();
  runIntroSequence();
  setupTypewriter();
  setupScrambleOnLoad();
  setupHeaderScroll();
  setupScrollSpy();
  setupReveal();
  setupCursorGlow();
  setupCustomCursor();
  setupTilt();
  setupMagneticButtons();
  setupMobileNav();
  setupPlaceholderLinks();
  setupGithubStats();
  setupEmailReveal();
  setActiveNavByPage();
  setupPrescriptDemo();
  setupFooterYear();
});
