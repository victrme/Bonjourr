'use strict';

/*
  COZY RAIN v2 — physics + a few real rendering-literature techniques
  ─────────────────────────────────────────────────────────────────
  Fall speed: blended Gunn & Kinzer (1949) / Atlas & Ulbrich (1977) empirical
  curves (v = 3.778*D^0.67, D in mm), capped near the real ~9.5 m/s ceiling.
  Drop sizes: Marshall–Palmer exponential sampling, N(D) = N0*exp(-lambda*D),
  lambda tracking a slowly-drifting simulated rain rate.
  Wind: an Ornstein–Uhlenbeck process (dV = theta*(mean-V)*dt + sigma*sqrt(dt)*Z),
  the standard model for temporally-correlated, mean-reverting wind speed
  (e.g. Obukhov et al. 2021) — gusts build and decay coherently instead of
  wobbling frame to frame. The long-run mean itself drifts slowly and is
  biased negative (upper-right -> lower-left) but can fully reverse.
  Splashes: energy-scaled (0.5*m*v^2, m~D^3) with 5th-root Weber-like
  compression, and — per oblique-impact splash research (crown/ligament
  formation concentrates on the leeward side under wind-driven impact,
  e.g. studies of drop impact in crosswind) — the ripple is offset and
  stretched toward the direction of travel rather than a perfect circle,
  with secondary droplets biased the same way.
  Depth: far-layer rain is drawn to a half-resolution offscreen canvas and
  composited with a single drawImage — the half-to-full upscale already
  gives a free soft-focus look, and it's cheaper than an explicit blur
  filter, which cost roughly half the frame rate for barely more softness
  in testing; mid is crisp, near is boosted for foreground presence.
  Static and slow-moving background layers (vignette, glass sheen, cloud
  light) are pre-rendered to small offscreen canvases and blitted rather
  than re-rasterizing full-canvas gradients every frame — that turned out
  to matter more than the blur at large (ultrawide) canvas sizes.
  No ctx.save()/restore() in any per-particle path — every fill/stroke
  style carries its own alpha baked in, so there's no per-frame global
  state to push or leak between draws.
*/

// ── Canvas & offscreen far-layer setup ──────────────────────────────────
const canvas = document.getElementById('rain');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
let farCanvas, farCtx;

// ── Small math utilities ────────────────────────────────────────────────
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

let _spareGaussian = null;
function gaussianRandom() {
  if (_spareGaussian !== null) { const v = _spareGaussian; _spareGaussian = null; return v; }
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const mag = Math.sqrt(-2 * Math.log(u));
  _spareGaussian = mag * Math.sin(2 * Math.PI * v);
  return mag * Math.cos(2 * Math.PI * v);
}

// 1D value noise (smoothstep-interpolated) — used only for the slow rain
// rate drift, which doesn't need OU's autocorrelation properties.
const NOISE_SIZE = 256;
const noiseTable = Array.from({ length: NOISE_SIZE }, () => Math.random() * 2 - 1);
function noise1D(x) {
  const xi = Math.floor(x);
  const xf = x - xi;
  const i0 = ((xi % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE;
  const i1 = (i0 + 1) % NOISE_SIZE;
  const t = smoothstep(xf);
  return noiseTable[i0] * (1 - t) + noiseTable[i1] * t;
}

// ── Lightweight event hooks (sound-ready, renderer stays unaware) ──────
// A future audio layer can subscribe without this file ever importing or
// knowing about it — 'splash' fires per impact, 'ambient' about once a
// second with the current simulated rain rate / wind so a mixer could
// crossfade loops by intensity.
const RainEvents = (() => {
  const listeners = {};
  return {
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit(name, data) { (listeners[name] || []).forEach(fn => fn(data)); },
  };
})();
window.RainEvents = RainEvents;

// ── Scale & physical constants ──────────────────────────────────────────
const PPM = 130;                    // pixels per simulated metre
const GRAVITY_PX = 9.81 * PPM;      // px / s^2

// ── Palette ──────────────────────────────────────────────────────────────
const PALETTE = {
  offwhite: { r: 238, g: 241, b: 246 },
  light:    { r: 195, g: 203, b: 216 },
  medium:   { r: 143, g: 153, b: 171 },
  gray:     { r: 109, g: 119, b: 136 },
};
function jitterColor(base, amt) {
  return {
    r: clamp(base.r + amt * 255, 0, 255) | 0,
    g: clamp(base.g + amt * 255, 0, 255) | 0,
    b: clamp(base.b + amt * 255, 0, 255) | 0,
  };
}
function rgba(c, a) { return `rgba(${c.r},${c.g},${c.b},${clamp(a, 0, 1).toFixed(3)})`; }
function pickDropColorObj(z) {
  const r = Math.random();
  let base;
  if (z > 0.72) base = r < 0.55 ? PALETTE.offwhite : PALETTE.light;
  else if (z > 0.40) base = r < 0.50 ? PALETTE.light : PALETTE.medium;
  else base = r < 0.60 ? PALETTE.medium : PALETTE.gray;
  return jitterColor(base, (Math.random() - 0.5) * 0.07);
}

// ── Wind: Ornstein–Uhlenbeck process ────────────────────────────────────
// Coherent gusts, not per-frame wobble: speed mean-reverts toward a slowly
// wandering long-run mean, with genuinely correlated random fluctuation
// (Gaussian, not uniform noise) — the standard SDE model for real wind-
// speed autocorrelation. Biased negative on average (rain leaning from
// upper-right to lower-left) but the mean is free to cross zero and fully
// reverse over a minute or two.
const Wind = {
  speed: -1.0, mean: -1.0, prevMean: -1.0, meanTarget: -1.0,
  meanTimer: 0, meanDuration: 60,
  theta: 0.24,   // reversion rate, 1/s
  sigma: 0.46,   // volatility, (m/s)/sqrt(s)
  update(dt) {
    this.meanTimer += dt;
    if (this.meanTimer >= this.meanDuration) {
      this.meanTimer = 0;
      this.meanDuration = rnd(55, 120);
      this.prevMean = this.mean;
      this.meanTarget = rnd(-1.9, 0.7);
    }
    this.mean = lerp(this.prevMean, this.meanTarget, smoothstep(this.meanTimer / this.meanDuration));
    const dv = this.theta * (this.mean - this.speed) * dt + this.sigma * Math.sqrt(dt) * gaussianRandom();
    this.speed = clamp(this.speed + dv, -3.2, 3.2);
  },
};
function rainIntensityMMHR(t) {
  const n = noise1D(t * 0.007 + 900);
  return clamp(lerp(2.5, 12.5, (n + 1) / 2), 2.5, 12.5); // mm/hr
}

// ── Drop-size sampling (Marshall–Palmer) ────────────────────────────────
function sampleDiameterMM(lambda) {
  const u = Math.random();
  let d = -Math.log(1 - u) / lambda;
  if (d < 0.16) d = 0.16 + Math.random() * 0.05;
  if (d > 5.5) d = 5.5 - Math.random() * 0.4; // real drops break up past ~5-6mm
  return d;
}
function terminalVelocityMS(D) {
  const small = 0.27 * Math.pow(D / 0.1, 1.15);
  const large = Math.min(3.778 * Math.pow(Math.max(D, 0.001), 0.67), 9.5);
  if (D >= 1.15) return large;
  if (D <= 0.85) return small;
  return lerp(small, large, (D - 0.85) / 0.30);
}

// ── Drops ────────────────────────────────────────────────────────────────
let currentLambda = 3.0;
function layerZ(layer) {
  if (layer === 'far') return rnd(0, 0.33);
  if (layer === 'mid') return rnd(0.33, 0.66);
  return rnd(0.66, 1);
}

class Drop {
  constructor(layer) { this.layer = layer; this.reset(true); }

  reset(initial) {
    this.z = layerZ(this.layer);
    this.D = sampleDiameterMM(currentLambda);
    // Rare "hero" droplets — big, bright, deliberately uncommon, only in
    // the foreground layer where they'll actually read as a focal detail.
    if (this.layer === 'near' && Math.random() < 0.012) this.D = rnd(3.6, 5.4);

    this.vt = terminalVelocityMS(this.D) * PPM;
    // Small drops relax to wind fast and get deflected a bigger fraction
    // of it (higher drag-to-mass ratio) — but gain is capped well under 1
    // even at the extreme, so a drop can lean, never out-run its own fall
    // speed sideways.
    this.windRate = clamp(0.9 / this.D, 0.15, 4.5);
    this.windGain = clamp(0.55 / this.D, 0.09, 0.30);
    this.turbPhase = Math.random() * Math.PI * 2;
    this.turbFreq = 0.6 + Math.random() * 1.2;

    const colorObj = pickDropColorObj(this.z);
    const depthFactor = lerp(0.6, 1.15, this.z);
    this.thickness = clamp(this.D * 0.62 * depthFactor, 0.5, 3.6);
    // Alpha ramps with size so the population reads as composed rather
    // than uniform: lots of faint small streaks, fewer bright long ones,
    // rare bright hero drops at the top of the curve.
    this.alpha = clamp(lerp(0.13, 0.95, Math.min(1, this.D / 2.6)), 0.11, 0.97) * lerp(0.55, 1.0, this.z);
    this.colorRGBA = rgba(colorObj, this.alpha);

    this.x = rnd(-120, W + 120);
    this.y = initial ? rnd(-H * 0.6, H * 1.05) : rnd(-60, -6);
    this.vx = 0;
    this.vy = initial ? rnd(0, this.vt) : 0;
  }

  groundY() { return H - 6 - (1 - this.z) * 16; }
  offscreen() { return this.x < -220 || this.x > W + 220 || this.y > H + 80; }

  update(dt, wind_px, t) {
    const rel = this.vt > 0 ? this.vy / this.vt : 0;
    this.vy += GRAVITY_PX * (1 - rel * rel) * dt;
    if (this.vy < 0) this.vy = 0;

    const targetVx = wind_px * this.windGain;
    this.vx += (targetVx - this.vx) * this.windRate * dt;
    this.vx += Math.sin(t * this.turbFreq + this.turbPhase) * 7 * this.windGain * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(targetCtx, prominence) {
    const speed = Math.hypot(this.vx, this.vy) || 1;
    const nx = this.vx / speed, ny = this.vy / speed;
    const len = clamp((this.D * 2.0 + speed * 0.03) * prominence, 6, 60);
    targetCtx.strokeStyle = this.colorRGBA;
    targetCtx.lineWidth = this.thickness * prominence;
    targetCtx.lineCap = 'round';
    targetCtx.beginPath();
    targetCtx.moveTo(this.x, this.y);
    targetCtx.lineTo(this.x - nx * len, this.y - ny * len);
    targetCtx.stroke();
  }
}

const layers = { far: [], mid: [], near: [] };
const LAYER_SHARE = { far: 0.42, mid: 0.33, near: 0.25 };
const LAYER_PROMINENCE = { far: 0.9, mid: 1.0, near: 1.32 };

function updateLayer(name, target, dt, wind_px, t, targetCtx) {
  const arr = layers[name];
  const prominence = LAYER_PROMINENCE[name];
  while (arr.length < target) arr.push(new Drop(name));

  for (let i = arr.length - 1; i >= 0; i--) {
    const d = arr[i];
    d.update(dt, wind_px, t);

    if (d.y >= d.groundY()) {
      spawnSplash(d, wind_px);
      if (arr.length > target) { arr.splice(i, 1); continue; }
      d.reset(false);
    } else if (d.offscreen()) {
      if (arr.length > target) { arr.splice(i, 1); continue; }
      d.reset(false);
    }
    d.draw(targetCtx, prominence);
  }
}

// ── Splash / impact particles ───────────────────────────────────────────
const particles = [];

function spawnSplash(drop, wind_px) {
  const x = drop.x, y = drop.groundY(), D = drop.D;
  const v_ms = drop.vy / PPM;
  const colorObj = pickDropColorObj(Math.min(1, drop.z + 0.15));
  const leeward = drop.vx >= 0 ? 1 : -1;
  const leewardStrength = clamp(Math.abs(drop.vx) / 260, 0, 1);

  if (D < 0.26) {
    if (Math.random() < 0.25) {
      particles.push({ kind: 'mist', x, y, vx: rnd(-8, 8), vy: -rnd(2, 12),
        r: rnd(0.4, 1.0), colorBase: colorObj, alpha: rnd(0.03, 0.07), decay: rnd(1.0, 2.0), life: 1 });
    }
    return;
  }

  const massRel = Math.pow(D, 3);
  const energyRel = 0.5 * massRel * v_ms * v_ms;
  const splashScale = clamp(Math.pow(energyRel, 0.2), 0.22, 3.0);

  // Asymmetric crown: oblique-impact splash research shows the crown and
  // its ligaments form preferentially on the leeward side, with just a
  // swell on the windward side — so the ripple centre nudges downwind and
  // stretches along the direction of travel instead of a perfect circle.
  const maxR = clamp(splashScale * 3.0, 1.5, 9.5);
  particles.push({
    kind: 'ripple', x: x + leeward * leewardStrength * maxR * 0.28, y, colorBase: colorObj,
    r: 0.4, maxR,
    aspect: clamp(0.22 + leewardStrength * 0.14 + Math.random() * 0.08, 0.2, 0.5),
    rot: leeward * leewardStrength * 0.5,
    alpha: clamp(0.05 + splashScale * 0.05, 0.05, 0.26),
    decay: rnd(1.5, 3.4), life: 1,
  });

  // Occasional leeward ligament ticks — the crown rim breaking into short
  // fingers — only for impacts with enough energy, and not every time.
  if (D > 1.3 && Math.random() < 0.4) {
    const nt = Math.round(rnd(2, 4));
    for (let i = 0; i < nt; i++) {
      const a = -Math.PI / 2 + leeward * rnd(0.15, 0.75);
      particles.push({ kind: 'tick', x, y, colorBase: colorObj, ang: a,
        len: rnd(2.5, 5.5) * splashScale, alpha: clamp(0.10 + splashScale * 0.08, 0.08, 0.3),
        decay: rnd(2.2, 4.0), life: 1 });
    }
  }

  // Secondary droplets, biased leeward; count varies (sometimes none) so
  // impacts don't all look identical.
  const n = Math.random() < 0.18 ? 0 : Math.round(clamp(splashScale * rnd(0.9, 2.0), 0, 6));
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + leeward * rnd(0.1, 0.55) + rnd(-0.3, 0.3);
    const spd = rnd(6, 13 + splashScale * 20);
    particles.push({ kind: 'drop', x, y, colorBase: colorObj,
      vx: Math.cos(ang) * spd + drop.vx * 0.15, vy: Math.sin(ang) * spd - rnd(3, 12),
      size: clamp(splashScale * rnd(0.35, 0.9), 0.3, 1.8),
      alpha: clamp(0.16 + splashScale * 0.12, 0.14, 0.5), decay: rnd(2.5, 5.5), life: 1 });
  }

  if (D < 2.2 && Math.random() < 0.4) {
    particles.push({ kind: 'mist', x: x + rnd(-4, 4), y: y - rnd(0, 4),
      vx: wind_px * 0.15 + rnd(-7, 7), vy: -rnd(2, 9), r: rnd(1, 2.6),
      colorBase: PALETTE.light, alpha: rnd(0.02, 0.06), decay: rnd(1.0, 2.2), life: 1 });
  }

  RainEvents.emit('splash', { x, y, D, impactSpeed: v_ms, intensity: splashScale });
}

function updateParticles(dt, wind_px) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const s = particles[i];
    s.life -= s.decay * dt;
    if (s.life <= 0) { particles.splice(i, 1); continue; }
    const a = clamp(s.alpha * s.life, 0, 1);

    if (s.kind === 'ripple') {
      const progress = s.r / s.maxR;
      const rate = lerp(85, 16, smoothstep(progress));
      s.r = Math.min(s.r + rate * dt, s.maxR);
      const rr = Math.max(0, s.r);
      ctx.strokeStyle = rgba(s.colorBase, a);
      ctx.lineWidth = clamp(0.6 * s.life, 0.15, 0.8);
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, rr, rr * s.aspect, s.rot, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.kind === 'tick') {
      const l = s.len * (0.4 + 0.6 * s.life);
      ctx.strokeStyle = rgba(s.colorBase, a);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(s.ang) * l, s.y + Math.sin(s.ang) * l);
      ctx.stroke();
    } else if (s.kind === 'drop') {
      s.vy += GRAVITY_PX * 0.55 * dt;
      s.vx = lerp(s.vx, wind_px * 0.25, 0.05);
      s.x += s.vx * dt; s.y += s.vy * dt;
      ctx.fillStyle = rgba(s.colorBase, a);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
    } else if (s.kind === 'mist') {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy *= 0.985;
      ctx.fillStyle = rgba(s.colorBase, a);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ── Atmospheric ground haze (restrained) ────────────────────────────────
const mistBands = [];
function spawnMistBand() {
  return { x: rnd(-140, W + 140), y: H - rnd(0, 30), w: rnd(60, 170), h: rnd(3, 10),
    alpha: rnd(0.010, 0.038), vx: rnd(-3, 3), life: 1, decay: rnd(0.14, 0.32) };
}
function initMist() { for (let i = 0; i < 7; i++) { const m = spawnMistBand(); m.life = rnd(0.1, 1); mistBands.push(m); } }
function updateMist(dt, wind_px) {
  if (mistBands.length < 9 && Math.random() < dt * 0.5) mistBands.push(spawnMistBand());
  for (let i = mistBands.length - 1; i >= 0; i--) {
    const m = mistBands[i];
    m.vx = lerp(m.vx, wind_px * 0.3, 0.01);
    m.x += m.vx * dt;
    m.life -= m.decay * dt;
    if (m.life <= 0) { mistBands.splice(i, 1); continue; }
    ctx.fillStyle = rgba(PALETTE.light, m.alpha * smoothstep(m.life));
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.w * 0.5, m.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Background, cloud light, ground sheen, bokeh, vignette, glass sheen ─
// The page background is transparent (see <style>) so Bonjourr's real
// background shows through this overlay — the canvas only clearRects it,
// no opaque fill is painted here.
// Vignette + glass sheen never change shape between resizes, so they're
// pre-rendered once to an offscreen canvas and blitted (one cheap
// drawImage) instead of re-rasterizing two full-canvas gradients every
// frame — gradient fills, not just blur, turned out to be the bigger
// cost at large (ultrawide) canvas sizes in testing.
let overlayCanvas, overlayCtx;
function buildStaticOverlay() {
  if (!overlayCanvas) { overlayCanvas = document.createElement('canvas'); overlayCtx = overlayCanvas.getContext('2d'); }
  overlayCanvas.width = W; overlayCanvas.height = H;
  overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
  overlayCtx.clearRect(0, 0, W, H);

  const R = Math.max(W, H) * 0.68;
  const vignetteGradient = overlayCtx.createRadialGradient(0, 0, 0.22 * R, 0, 0, R);
  vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
  vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.42)');
  overlayCtx.save();
  overlayCtx.translate(W / 2, H / 2);
  overlayCtx.fillStyle = vignetteGradient;
  overlayCtx.fillRect(-R, -R, R * 2, R * 2);
  overlayCtx.restore();

  const glassSheenGradient = overlayCtx.createLinearGradient(0, 0, W * 0.6, H);
  glassSheenGradient.addColorStop(0, 'rgba(200,215,235,0.035)');
  glassSheenGradient.addColorStop(0.15, 'rgba(200,215,235,0.012)');
  glassSheenGradient.addColorStop(0.35, 'rgba(200,215,235,0)');
  glassSheenGradient.addColorStop(1, 'rgba(200,215,235,0)');
  overlayCtx.fillStyle = glassSheenGradient;
  overlayCtx.fillRect(0, 0, W, H);
}
function drawBackground() { ctx.clearRect(0, 0, W, H); }
function drawStaticOverlay() { ctx.drawImage(overlayCanvas, 0, 0, W, H); }

// Soft diffuse backlight suggesting moonlight through cloud cover — drifts
// extremely slowly, so it's re-rasterized to a small offscreen canvas only
// occasionally and blitted (scaled) every frame in between, rather than
// re-evaluating a full-canvas radial gradient 60 times a second for
// something that barely moves.
const cloudLight = { xFrac: 0.42, yFrac: 0.26, phase: rnd(0, 10) };
let cloudCanvas, cloudCtx, cloudRefreshTimer = 0;
function refreshCloudLight(t) {
  if (!cloudCanvas) { cloudCanvas = document.createElement('canvas'); cloudCtx = cloudCanvas.getContext('2d'); }
  const cw = Math.max(1, Math.round(W * 0.25)), ch = Math.max(1, Math.round(H * 0.25));
  if (cloudCanvas.width !== cw) cloudCanvas.width = cw;
  if (cloudCanvas.height !== ch) cloudCanvas.height = ch;
  cloudCtx.clearRect(0, 0, cw, ch);
  const cx = (cloudLight.xFrac * W + Math.sin(t * 0.004 + cloudLight.phase) * W * 0.08) * 0.25;
  const cy = (cloudLight.yFrac * H + Math.cos(t * 0.003 + cloudLight.phase) * H * 0.05) * 0.25;
  const r = Math.max(W, H) * 0.55 * 0.25;
  const g = cloudCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(120,135,165,0.05)');
  g.addColorStop(0.5, 'rgba(90,105,140,0.024)');
  g.addColorStop(1, 'rgba(90,105,140,0)');
  cloudCtx.fillStyle = g;
  cloudCtx.fillRect(0, 0, cw, ch);
}
function drawCloudLight(t, dt) {
  cloudRefreshTimer += dt;
  if (!cloudCanvas || cloudRefreshTimer > 0.18) { cloudRefreshTimer = 0; refreshCloudLight(t); }
  ctx.drawImage(cloudCanvas, 0, 0, W, H);
}

function drawGroundSheen() {
  const py = H - 6;
  const g = ctx.createLinearGradient(0, py - 10, 0, py + 6);
  g.addColorStop(0, 'rgba(130,155,190,0)');
  g.addColorStop(0.5, 'rgba(110,140,180,0.09)');
  g.addColorStop(1, 'rgba(90,120,165,0.04)');
  ctx.fillStyle = g;
  ctx.fillRect(0, py - 10, W, 16);
}

let bokehLights = [];
function drawBokeh(t) {
  for (const b of bokehLights) {
    const bx = b.xFrac * W + Math.sin(t * 0.015 + b.phase) * 18;
    const by = b.yFrac * H + Math.cos(t * 0.011 + b.phase) * 8;
    const flicker = 0.85 + 0.15 * Math.sin(t * 0.6 + b.phase * 3);
    const alpha = 0.055 * flicker;
    const rgbStr = b.warm ? '255,214,170' : '190,205,225';
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
    g.addColorStop(0, `rgba(${rgbStr},${alpha})`);
    g.addColorStop(1, `rgba(${rgbStr},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(bx - b.r, by - b.r, b.r * 2, b.r * 2);
  }
}

// ── Foreground window glass: slower, fewer, better-lit condensation ────
class GlassDrop {
  constructor() { this.reset(true); }
  reset(initial) {
    this.x = rnd(W * 0.06, W * 0.94);
    this.y = initial ? rnd(-H * 0.3, H * 0.5) : rnd(-40, -6);
    this.v = rnd(1.2, 3.4);
    this.r = rnd(1.5, 3.1);
    this.stickTimer = rnd(0.6, 3.0);
    this.trail = [];
    this.alpha = rnd(0.09, 0.17);
    this.colorObj = Math.random() < 0.5 ? PALETTE.light : PALETTE.offwhite;
  }
  update(dt) {
    this.stickTimer -= dt;
    if (this.stickTimer <= 0) { this.v += rnd(7, 24); this.stickTimer = rnd(0.7, 3.4); }
    this.v = lerp(this.v, rnd(1.6, 4.2), 0.02);
    this.y += this.v * dt;
    this.x += Math.sin(this.y * 0.017) * 1.4 * dt;
    // Trail points are sampled by distance travelled, not by frame — at a
    // slow ~1-4px/s crawl, one point per frame only spans a fraction of a
    // pixel of history and reads as a dot, not a trail.
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(this.x - last.x, this.y - last.y) > 1.4) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 26) this.trail.shift();
    }
    if (this.y > H + 20) this.reset(false);
  }
  draw() {
    const a = this.alpha;
    if (this.trail.length > 1) {
      const t0 = this.trail[0];
      const grad = ctx.createLinearGradient(t0.x, t0.y, this.x, this.y);
      grad.addColorStop(0, rgba(this.colorObj, 0));
      grad.addColorStop(1, rgba(this.colorObj, a * 0.4));
      ctx.strokeStyle = grad;
      ctx.lineWidth = this.r * 0.48;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      for (const p of this.trail) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    // Specular highlight + faint refractive rim, alpha pre-baked into each
    // gradient stop so no ctx.globalAlpha state is needed at all.
    const g = ctx.createRadialGradient(this.x - this.r * 0.35, this.y - this.r * 0.35, 0, this.x, this.y, this.r);
    g.addColorStop(0, `rgba(255,255,255,${(0.95 * a).toFixed(3)})`);
    g.addColorStop(0.32, rgba(this.colorObj, 0.9 * a));
    g.addColorStop(0.78, rgba({ r: 60, g: 70, b: 88 }, 0.35 * a));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
  }
}
let glassDrops = [];

// ── Responsive art direction ────────────────────────────────────────────
// Adapts composition (density, bokeh count, glass count), not just canvas
// scale, to phone / laptop / ultrawide aspect ratios.
let sceneParams = {};
function computeSceneParams() {
  const area = W * H;
  const aspect = W / H;
  sceneParams = {
    areaFactor: clamp(area / (1280 * 720), 0.4, 1.8),
    classDensity: aspect > 2.05 ? 0.80 : aspect < 0.8 ? 0.90 : 1.0,
    bokehCount: aspect > 2.0 ? 6 : aspect < 0.8 ? 2 : 4,
    glassCount: Math.round(clamp(3 + area / 900000, 3, 6)),
  };
}
function rebuildResponsiveActors() {
  bokehLights = Array.from({ length: sceneParams.bokehCount }, (_, i) => ({
    xFrac: rnd(0.05, 0.95), yFrac: rnd(0.12, 0.48), r: rnd(30, 70), warm: Math.random() < 0.5, phase: rnd(0, 10) + i,
  }));
  glassDrops = Array.from({ length: sceneParams.glassCount }, () => new GlassDrop());
}

// ── Resize / init ────────────────────────────────────────────────────────
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!farCanvas) { farCanvas = document.createElement('canvas'); farCtx = farCanvas.getContext('2d'); }
  farCanvas.width = Math.max(1, Math.round(W * 0.5));
  farCanvas.height = Math.max(1, Math.round(H * 0.5));
  farCtx.setTransform(0.5, 0, 0, 0.5, 0, 0);

  buildStaticOverlay();
  computeSceneParams();
  rebuildResponsiveActors();
}
window.addEventListener('resize', resize);

// ── Main loop ────────────────────────────────────────────────────────────
let last = performance.now();
let simTime = 0;
let ambientEventTimer = 0;

function tick(now) {
  requestAnimationFrame(tick);
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.max(0, Math.min(dt, 0.05));
  simTime += dt;

  Wind.update(dt);
  const windMS = Wind.speed;
  const wind_px = windMS * PPM;
  const rainRate = rainIntensityMMHR(simTime);
  currentLambda = 4.1 * Math.pow(rainRate, -0.21);

  const targetTotal = Math.round(lerp(190, 480, (rainRate - 2.5) / 10) * sceneParams.areaFactor * sceneParams.classDensity);
  const targets = {
    far: Math.round(targetTotal * LAYER_SHARE.far),
    mid: Math.round(targetTotal * LAYER_SHARE.mid),
    near: Math.round(targetTotal * LAYER_SHARE.near),
  };

  drawBackground();
  drawCloudLight(simTime, dt);
  drawBokeh(simTime);
  updateMist(dt, wind_px);

  // Far layer: draw to a half-res offscreen canvas, then composite once.
  // The half-res -> full-res upscale already does a free bilinear soften;
  // an explicit ctx.filter blur pass roughly doubled frame cost in testing
  // for a marginal extra softness, so it's skipped — cheap depth cue over
  // an expensive one, per the same efficiency trade-off real-time rain
  // renderers in the literature make.
  farCtx.clearRect(0, 0, W, H);
  updateLayer('far', targets.far, dt, wind_px, simTime, farCtx);
  ctx.drawImage(farCanvas, 0, 0, W, H);

  updateLayer('mid', targets.mid, dt, wind_px, simTime, ctx);
  updateLayer('near', targets.near, dt, wind_px, simTime, ctx);

  updateParticles(dt, wind_px);
  drawGroundSheen();
  drawStaticOverlay();

  for (const g of glassDrops) { g.update(dt); g.draw(); }

  ambientEventTimer += dt;
  if (ambientEventTimer > 1.2) {
    ambientEventTimer = 0;
    RainEvents.emit('ambient', { rainRateMMHR: rainRate, windMS });
  }
}

resize();
initMist();
requestAnimationFrame(tick);
