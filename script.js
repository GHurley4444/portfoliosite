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
  setupFooterYear();
});
