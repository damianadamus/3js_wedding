// Stop-motion flavour: boiling line-work, bats, spirals and lines that draw themselves.

const NS = 'http://www.w3.org/2000/svg';

function spiralPath(cx, cy, turns, maxR, steps = 220) {
  let d = '';
  const maxTh = turns * Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * maxTh;
    const r = (th / maxTh) * maxR;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(th) * r).toFixed(1)} ${(cy + Math.sin(th) * r).toFixed(1)}`;
  }
  return d;
}

// a looping, curly "road" — a trochoid with a little wobble
function curlPath(width, height, loops) {
  const a = width / (loops * Math.PI * 2 + 2), b = a * 1.4;
  const tMax = (width - 2 * b) / a;
  let d = '';
  for (let i = 0; i <= 600; i++) {
    const t = (i / 600) * tMax;
    const x = b + a * t - b * Math.sin(t);
    const y = height / 2 - b * 0.9 * Math.cos(t) + Math.sin(t * 0.37) * 6;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

const BAT = `<svg viewBox="0 0 100 46" aria-hidden="true"><path d="M50 12l-3-7 3 3 3-3-3 7c4 0 6 3 6 7C64 6 80 2 98 8c-7 2-10 8-9 15-5-4-11-4-15 1-3-5-9-6-13-1-2 3-5 6-7 9-2-3-5-6-7-9-4-5-10-4-13 1-4-5-10-5-15-1 1-7-2-13-9-15 18-6 34-2 42 11 0-4 2-7 6-7z"/></svg>`;

export function initBurton({ reduced }) {
  // the "boil": re-seed the displacement noise at ~9fps, like redrawn animation frames
  const turb = document.querySelector('#boil feTurbulence');
  if (turb && !reduced) {
    let seed = 0;
    setInterval(() => turb.setAttribute('seed', (seed = (seed + 1) % 6)), 110);
  }

  document.querySelectorAll('[data-spiral]').forEach((p) => {
    const [cx, cy, turns, r] = p.dataset.spiral.split(',').map(Number);
    p.setAttribute('d', spiralPath(cx, cy, turns, r));
  });

  document.querySelectorAll('[data-curl]').forEach((p) => {
    const [w, h, loops] = p.dataset.curl.split(',').map(Number);
    p.setAttribute('d', curlPath(w, h, loops));
  });

  document.querySelectorAll('[data-bats]').forEach((layer) => {
    const n = Number(layer.dataset.bats);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'bat';
      el.innerHTML = BAT;
      const s = 18 + Math.random() * 46;
      Object.assign(el.style, {
        left: `${Math.random() * 92}%`,
        top: `${Math.random() * 70}%`,
        width: `${s}px`,
        animationDelay: `${-Math.random() * 12}s`,
        animationDuration: `${9 + Math.random() * 8}s`,
      });
      el.firstChild.style.animationDelay = `${-Math.random()}s`;
      layer.appendChild(el);
    }
  });

  // lines that draw themselves as they scroll into view
  const draws = [...document.querySelectorAll('[data-draw]')].map((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    return { p, len, host: p.closest('svg') };
  });

  return {
    update() {
      const vh = window.innerHeight;
      for (const d of draws) {
        const r = d.host.getBoundingClientRect();
        const prog = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.8 + r.height * 0.5)));
        d.p.style.strokeDashoffset = `${d.len * (1 - (reduced ? 1 : prog))}`;
      }
    },
  };
}
