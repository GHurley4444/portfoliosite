// ===================== Boot sequence =====================
const bootLines = [
  '> INITIALIZING SYSTEM...',
  '> LOADING IDENTITY MODULE... OK',
  '> LOADING PROJECT INDEX... OK',
  '> LOADING BEEPER.FIRMWARE... OK',
  '> ACCESS GRANTED',
];

function runBootSequence() {
  const overlay = document.getElementById('bootOverlay');
  const textEl = document.getElementById('bootText');
  if (!overlay || !textEl) return;

  // Respect reduced motion / repeat visits: skip long boot after first load in a session
  const skip = sessionStorage && sessionStorage.getItem('beeper_booted');
  if (skip) {
    overlay.classList.add('hidden');
    return;
  }

  let lineIndex = 0;
  let charIndex = 0;
  let output = '';

  function typeNext() {
    if (lineIndex >= bootLines.length) {
      setTimeout(() => {
        overlay.classList.add('hidden');
        try { sessionStorage.setItem('beeper_booted', '1'); } catch (e) {}
      }, 350);
      return;
    }
    const line = bootLines[lineIndex];
    if (charIndex <= line.length) {
      output = bootLines.slice(0, lineIndex).join('\n') + (lineIndex > 0 ? '\n' : '') + line.slice(0, charIndex);
      textEl.textContent = output;
      charIndex++;
      setTimeout(typeNext, 14);
    } else {
      lineIndex++;
      charIndex = 0;
      setTimeout(typeNext, 180);
    }
  }

  typeNext();
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
      reposEl.textContent = user.public_repos ?? '—';
      followersEl.textContent = user.followers ?? '—';
    }

    const reposRes = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=1`);
    if (reposRes.ok) {
      const repos = await reposRes.json();
      lastRepoEl.textContent = repos && repos[0] ? repos[0].name : 'none yet';
    }
  } catch (e) {
    console.info('[portfolio] GitHub API unavailable right now:', e);
    reposEl.textContent = '—';
    followersEl.textContent = '—';
    lastRepoEl.textContent = '—';
  }
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

    if (cat === 'TIMED') {
      const secs = String(Math.max(state.timed.secondsLeft, 0)).padStart(2, '0');
      diffEl.textContent = `⏱ 0:${secs}`;
      streakEl.textContent = 'RARE PULL';
      textEl.textContent = state.timed.text;
    } else {
      ensureLoaded(cat);
      const s = state.cats[cat];
      diffEl.textContent = `[${TIER_LABELS[s.tier]} ${s.streak}]`;
      streakEl.textContent = `s:${s.streak}`;
      textEl.textContent = s.text;
    }

    textEl.classList.remove('flash');
    void textEl.offsetWidth; // force reflow so the animation restarts
    textEl.classList.add('flash');
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
  runBootSequence();
  setupHeaderScroll();
  setupScrollSpy();
  setupReveal();
  setupCursorGlow();
  setupMobileNav();
  setupPlaceholderLinks();
  setupGithubStats();
  setActiveNavByPage();
  setupPrescriptDemo();
  setupFooterYear();
});
