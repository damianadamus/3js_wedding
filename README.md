# Rave Wedding

Paola & Bejlux — 04.08.2033, Warsaw. A black & white, Berlin/Paris-rave wedding website built with Three.js.

- One particle system that morphs on scroll: disco ball → wedding rings → Joy Division ridges → Burton spiral hill → galaxy → heart
- Parallax layers (scroll + mouse), smooth scrolling with Lenis
- Live-synthesised 128 BPM techno loop (Web Audio, no audio files) that drives the visuals
- Tim Burton–style stop-motion "boil", crooked skyline, bats and lanky dancers

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in dist/
```

## Customise

- Names, date, story, line-up, venue: `index.html`
- Countdown date: `WEDDING_DATE` in `src/main.js`
- RSVP form is front-end only — hook it up at the `TODO` in `src/main.js`
