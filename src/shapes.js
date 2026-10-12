// Particle target shapes. Each returns a Float32Array of xyz positions,
// one shape per page section (order matters — matches data-scene in index.html).

const TAU = Math.PI * 2;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const jitter = (s) => (Math.random() - 0.5) * s;

function rotate(arr, rx = 0, ry = 0) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  for (let i = 0; i < arr.length; i += 3) {
    let x = arr[i], y = arr[i + 1], z = arr[i + 2];
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
    arr[i] = x2; arr[i + 1] = y1; arr[i + 2] = z2;
  }
  return arr;
}

// 0 — mirror ball
export function discoBall(n) {
  const a = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const R = Math.random() < 0.9 ? 1.45 : rand(0.3, 1.4);
    a[i * 3] = Math.cos(th) * r * R;
    a[i * 3 + 1] = y * R;
    a[i * 3 + 2] = Math.sin(th) * r * R;
  }
  return a;
}

// 1 — two interlocking wedding rings
export function rings(n) {
  const a = new Float32Array(n * 3);
  const R = 1.05;
  for (let i = 0; i < n; i++) {
    if (Math.random() < 0.03) {
      a[i * 3] = jitter(6); a[i * 3 + 1] = jitter(4); a[i * 3 + 2] = jitter(3);
      continue;
    }
    const u = rand(TAU), v = rand(TAU);
    const tube = 0.08 * Math.sqrt(Math.random());
    const x = (R + tube * Math.cos(v)) * Math.cos(u);
    const y = (R + tube * Math.cos(v)) * Math.sin(u);
    const z = tube * Math.sin(v);
    if (i % 2) { a[i * 3] = x - 0.55; a[i * 3 + 1] = y; a[i * 3 + 2] = z; }
    else { a[i * 3] = x + 0.55; a[i * 3 + 1] = z; a[i * 3 + 2] = y; }
  }
  return rotate(a, -0.55, 0.45);
}

// 2 — Joy Division ridgelines (the shader makes them pulse)
export function ridges(n) {
  const a = new Float32Array(n * 3);
  const rows = 30;
  for (let i = 0; i < n; i++) {
    const row = i % rows;
    a[i * 3] = rand(-4.4, 4.4);
    a[i * 3 + 1] = -0.7;
    a[i * 3 + 2] = -3 + (row / (rows - 1)) * 6;
  }
  return rotate(a, 0.8, 0);
}

// 3 — the curly spiral hill (a moon hangs top-left)
export function spiralHill(n) {
  const a = new Float32Array(n * 3);
  const cx = 0.35, cy = 0.55, b = 0.09, maxTh = 5.5 * Math.PI;
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    let x, y;
    if (r < 0.5) {
      const th = Math.pow(Math.random(), 0.8) * maxTh;
      const rad = b * th;
      x = cx + Math.cos(th) * rad + jitter(0.06);
      y = cy + Math.sin(th) * rad + jitter(0.06);
    } else if (r < 0.88) {
      x = rand(-3.8, 3.8);
      y = cy - b * maxTh - 0.2 * (x - cx) ** 2 + jitter(0.07);
    } else {
      const t = rand(TAU);
      const rr = 0.5 + jitter(0.05);
      x = -2.3 + Math.cos(t) * rr;
      y = 1.55 + Math.sin(t) * rr;
    }
    a[i * 3] = x - 0.2;
    a[i * 3 + 1] = y;
    a[i * 3 + 2] = jitter(0.3);
  }
  return a;
}

// 4 — a galaxy for the afterhours
export function galaxy(n) {
  const a = new Float32Array(n * 3);
  const arms = 3, maxR = 3.2;
  for (let i = 0; i < n; i++) {
    const r = Math.pow(Math.random(), 1.6) * maxR;
    const arm = ((i % arms) / arms) * TAU;
    const spin = r * 1.7;
    const spread = 0.35 / (r + 0.35);
    const ang = arm + spin + jitter(spread * 2.2);
    a[i * 3] = Math.cos(ang) * r + jitter(0.12);
    a[i * 3 + 1] = jitter(0.3 * (1 - r / maxR));
    a[i * 3 + 2] = Math.sin(ang) * r + jitter(0.12);
  }
  return rotate(a, 1.05, 0);
}

// 5 — a heart, obviously
export function heart(n) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = rand(TAU);
    const s = Math.random() < 0.55 ? 1 : Math.sqrt(Math.random());
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    a[i * 3] = x * 0.13 * s + jitter(0.04);
    a[i * 3 + 1] = y * 0.13 * s + 0.25 + jitter(0.04);
    a[i * 3 + 2] = jitter(0.55 * (1 - s * 0.6));
  }
  return a;
}

export const SHAPES = [discoBall, rings, ridges, spiralHill, galaxy, heart];
