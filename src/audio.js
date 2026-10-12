// A tiny Berlin-meets-Paris techno loop, synthesized live with Web Audio.
// No audio files: kick, hats, clap, rolling acid bass and a filtered French-touch stab.

const BPM = 128;
const ROOTS = [55, 55, 43.65, 49]; // A, A, F, G — one per bar

// One second of 8 kHz mono silence as a WAV blob URL (see unlockIOS below).
function silentWavURL() {
  const rate = 8000, samples = rate, bytes = samples * 2;
  const v = new DataView(new ArrayBuffer(44 + bytes));
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, bytes, true);
  return URL.createObjectURL(new Blob([v], { type: 'audio/wav' }));
}

export class Rave {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.timer = null;
    this.silence = null;

    // iOS suspends/"interrupts" the context when the tab is hidden or the screen locks
    const wake = () => this.playing && this.ctx && this.ctx.state !== 'running' && this.ctx.resume();
    document.addEventListener('visibilitychange', () => !document.hidden && wake());
    window.addEventListener('pointerdown', wake);
  }

  // iOS Safari routes Web Audio through the "ambient" channel, which the ring/silent switch mutes.
  // Declaring a playback session (iOS 17+), or playing an <audio> element on the same tap (older iOS),
  // moves it to the media channel so the music plays like any video would.
  unlockIOS() {
    if (navigator.audioSession) {
      try { navigator.audioSession.type = 'playback'; } catch {}
      return;
    }
    if (!this.silence) {
      this.silence = new Audio(silentWavURL());
      this.silence.loop = true;
      this.silence.setAttribute('playsinline', '');
    }
    this.silence.play().catch(() => {});
  }

  init() {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 300;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(this.filter).connect(comp).connect(ctx.destination);

    // dub delay for stabs
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = (60 / BPM) * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const dlp = ctx.createBiquadFilter();
    dlp.frequency.value = 2200;
    this.delay.connect(dlp).connect(fb).connect(this.delay);
    dlp.connect(this.master);

    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // must be called synchronously inside a tap/click handler
  start() {
    this.unlockIOS();
    if (!this.ctx) this.init();
    const ctx = this.ctx;
    ctx.resume();
    const now = ctx.currentTime;
    this.startTime = now + 0.08;
    this.nextTime = this.startTime;
    this.step = 0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.75, now + 1.2);
    // the build: filter opens over ~16 bars
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(280, now);
    this.filter.frequency.exponentialRampToValueAtTime(18000, now + 14);
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
    this.playing = true;
  }

  stop() {
    if (!this.ctx || !this.playing) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.6);
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(this.filter.frequency.value, now);
    this.filter.frequency.exponentialRampToValueAtTime(250, now + 0.6);
    this.playing = false;
    setTimeout(() => {
      if (this.playing) return;
      clearInterval(this.timer);
      this.silence?.pause();
    }, 700);
  }

  toggle() {
    this.playing ? this.stop() : this.start();
    return this.playing;
  }

  /** 0..1 envelope that peaks on every kick, or null when silent */
  beat() {
    if (!this.playing) return null;
    const t = this.ctx.currentTime - this.startTime;
    if (t < 0) return 0;
    return Math.exp(-((t / (60 / BPM)) % 1) * 7);
  }

  schedule() {
    const sixteenth = 60 / BPM / 4;
    const now = this.ctx.currentTime;
    // after the tab was hidden, skip missed steps instead of firing them all at once (stays on the grid)
    if (this.nextTime < now) {
      const missed = Math.ceil((now - this.nextTime) / sixteenth);
      this.nextTime += missed * sixteenth;
      this.step = (this.step + missed) % 64;
    }
    while (this.nextTime < now + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  }

  playStep(s, t) {
    const b = s % 16;
    const bar = Math.floor(s / 16);
    const root = ROOTS[bar];
    if (b % 4 === 0) this.kick(t);
    if (b % 4 === 2) this.hat(t, 0.22, 0.09);
    else this.hat(t, 0.05, 0.03);
    if (b === 4 || b === 12) this.clap(t);
    if (b % 4 !== 0) this.bass(t, b % 4 === 3 ? root * 2 : root);
    if (b === 10 && bar % 2 === 1) this.stab(t, root * 4);
  }

  env(t, peak, decay) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    return g;
  }

  noiseSrc(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.start(t, Math.random() * 0.5, dur);
    return src;
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    o.connect(this.env(t, 1, 0.5)).connect(this.master);
    o.start(t);
    o.stop(t + 0.55);
  }

  hat(t, vol, decay) {
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    this.noiseSrc(t, decay + 0.02).connect(hp).connect(this.env(t, vol, decay)).connect(this.master);
  }

  clap(t) {
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1300;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach((o) => {
      g.gain.setValueAtTime(0.5, t + o);
      g.gain.exponentialRampToValueAtTime(0.1, t + o + 0.009);
    });
    g.gain.setValueAtTime(0.45, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    this.noiseSrc(t, 0.25).connect(bp).connect(g).connect(this.master);
  }

  bass(t, f) {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 9;
    const sweep = 300 + 900 * (0.5 + 0.5 * Math.sin(t * 0.35));
    lp.frequency.setValueAtTime(sweep, t);
    lp.frequency.exponentialRampToValueAtTime(110, t + 0.11);
    o.connect(lp).connect(this.env(t, 0.2, 0.12)).connect(this.master);
    o.start(t);
    o.stop(t + 0.14);
  }

  stab(t, f) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(280, t + 0.3);
    const g = this.env(t, 0.07, 0.35);
    lp.connect(g);
    g.connect(this.master);
    g.connect(this.delay);
    [1, 1.189, 1.498].forEach((r, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f * r;
      o.detune.value = (i - 1) * 9;
      o.connect(lp);
      o.start(t);
      o.stop(t + 0.4);
    });
  }
}
