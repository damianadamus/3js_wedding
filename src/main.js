import 'lenis/dist/lenis.css';
import './style.css';
import Lenis from 'lenis';
import { createScene } from './scene.js';
import { Rave } from './audio.js';
import { initBurton } from './burton.js';

const WEDDING_DATE = new Date('2033-08-04T16:00:00+02:00');
const BEAT_SEC = 60 / 128;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const body = document.body;

const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.085 });
lenis.stop();

const scene = createScene(document.getElementById('webgl'));
const rave = new Rave();
const burton = initBurton({ reduced });
if (import.meta.env.DEV) window.__wedding = { scene, rave, lenis };

/* ---------- door ---------- */
const soundBtn = document.querySelector('[data-sound]');
const setSoundLabel = () => {
  soundBtn.setAttribute('aria-pressed', String(rave.playing));
  soundBtn.querySelector('span').textContent = rave.playing ? 'Sound on · 128 BPM' : 'Sound off';
};
document.querySelectorAll('[data-enter]').forEach((btn) =>
  btn.addEventListener('click', () => {
    if (btn.dataset.enter === 'sound') rave.start();
    setSoundLabel();
    body.classList.add('entered');
    lenis.start();
  })
);
soundBtn.addEventListener('click', () => {
  rave.toggle();
  setSoundLabel();
});

/* ---------- countdown ---------- */
const days = Math.max(0, Math.ceil((WEDDING_DATE - Date.now()) / 86400000));
document.querySelectorAll('[data-countdown]').forEach((el) => (el.textContent = days));

/* ---------- pointer ---------- */
const mouse = { x: 0, y: 0, px: innerWidth / 2, py: innerHeight / 2 };
let pointerOn = false;
const cursor = document.querySelector('.cursor');
const cursorPos = { x: mouse.px, y: mouse.py };
window.addEventListener('pointermove', (e) => {
  mouse.px = e.clientX;
  mouse.py = e.clientY;
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  pointerOn = e.pointerType === 'mouse';
  body.classList.toggle('has-cursor', pointerOn);
});
document.addEventListener('pointerleave', () => (pointerOn = false));
document.addEventListener('pointerover', (e) => {
  cursor.classList.toggle('grow', !!e.target.closest('a, button, input, label, .row'));
});

/* ---------- scroll → scene ---------- */
const sections = [...document.querySelectorAll('[data-scene]')];
let tops = [];
const measure = () => (tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY));
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function morphFor(scroll) {
  const y = scroll + innerHeight * 0.5;
  let i = 0;
  while (i < tops.length - 1 && y >= tops[i + 1]) i++;
  if (i >= tops.length - 1) return tops.length - 1;
  return i + smoothstep(0.5, 1, (y - tops[i]) / (tops[i + 1] - tops[i]));
}

/* ---------- parallax ---------- */
const layers = [...document.querySelectorAll('[data-speed]')].map((el) => ({
  el,
  host: el.parentElement,
  speed: parseFloat(el.dataset.speed),
  depth: parseFloat(el.dataset.depth || 0),
}));
const sliders = [...document.querySelectorAll('[data-x]')].map((el) => ({ el, speed: parseFloat(el.dataset.x) }));
const progressBar = document.querySelector('.progress i');

function parallax() {
  const vh = innerHeight;
  // read everything first, then write, to avoid layout thrash
  const a = layers.map((l) => {
    const r = l.host.getBoundingClientRect();
    return (r.top + r.height / 2 - vh / 2) * l.speed;
  });
  const b = sliders.map((s) => s.el.getBoundingClientRect().top - vh / 2);
  layers.forEach((l, i) => {
    l.el.style.transform = `translate3d(${(mouse.x * l.depth).toFixed(1)}px, ${a[i].toFixed(1)}px, 0)`;
  });
  sliders.forEach((s, i) => (s.el.style.transform = `translate3d(${(b[i] * s.speed).toFixed(1)}px, 0, 0)`));
}

/* ---------- reveal ---------- */
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- RSVP ---------- */
// Submissions go to the Formspree endpoint in the form's `action` (index.html).
const form = document.querySelector('#rsvp-form');
const submitBtn = form.querySelector('[type=submit]');
const formError = form.querySelector('.form-error');
const showError = (msg) => {
  formError.textContent = msg;
  formError.hidden = false;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;
  if (form.action.includes('YOUR_FORM_ID')) {
    showError('RSVP is not connected yet — the Formspree form ID is missing.');
    return;
  }
  const body = new FormData(form);
  const data = Object.fromEntries(body);
  const label = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  try {
    const res = await fetch(form.action, { method: 'POST', body, headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error('Too many RSVPs at once — please try again in a minute.');
      throw new Error(json.errors?.map((er) => er.message).join(', ') || 'Something went wrong. Please try again.');
    }
  } catch (err) {
    showError(err instanceof TypeError ? 'Network error — check your connection and try again.' : err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = label;
    return;
  }
  const yes = data.attending === 'yes';
  form.classList.add('sent');
  form.querySelector('.thanks h3').textContent = yes ? `You're on the list, ${data.name.split(' ')[0]}.` : 'We’ll miss you.';
  form.querySelector('.thanks p').textContent = yes
    ? 'Black & white. Comfy shoes. See you on the floor.'
    : 'We’ll play one for you at sunrise.';
});

/* ---------- loop ---------- */
let morph = 0;
function frame(now) {
  lenis.raf(now);
  const t = now / 1000;
  const scroll = lenis.scroll;

  morph += (morphFor(scroll) - morph) * 0.08;

  let beat = rave.beat();
  if (beat === null) beat = reduced ? 0 : Math.exp(-((t / BEAT_SEC) % 1) * 7) * 0.3;
  root.style.setProperty('--beat', beat.toFixed(3));

  cursorPos.x += (mouse.px - cursorPos.x) * 0.22;
  cursorPos.y += (mouse.py - cursorPos.y) * 0.22;
  cursor.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`;

  parallax();
  burton.update();
  progressBar.style.transform = `scaleX(${lenis.progress || 0})`;

  scene.update({
    time: reduced ? t * 0.3 : t,
    morph,
    beat,
    mouse,
    scroll,
    scrollVel: lenis.velocity,
    pointerOn,
  });
  scene.render();
  requestAnimationFrame(frame);
}

function onResize() {
  scene.resize();
  measure();
}
window.addEventListener('resize', onResize);
window.addEventListener('load', measure);
document.fonts?.ready.then(measure);
measure();
requestAnimationFrame(frame);

// dev-only: lets automated checks advance frames while the tab is hidden
if (import.meta.env.DEV) window.__wedding.step = (n = 120, start = performance.now()) => {
  for (let i = 0; i < n; i++) frame(start + i * 16.7);
};
