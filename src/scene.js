import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SHAPES } from './shapes.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uBeat;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uScrollVel;
  uniform float uMouseStrength;
  uniform vec3 uMouse;

  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec3 aP4;
  attribute vec3 aP5;
  attribute float aRand;
  attribute float aSize;

  varying float vAlpha;

  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  float wgt(float i) { return clamp(1.0 - abs(uMorph - i), 0.0, 1.0); }

  void main() {
    vec3 s0 = aP0; s0.xz = rot(uTime * 0.25) * s0.xz;      // spinning mirror ball
    vec3 s4 = aP4; s4.xy = rot(-uTime * 0.06) * s4.xy;     // slow galaxy drift

    vec3 p = s0 * wgt(0.0) + aP1 * wgt(1.0) + aP2 * wgt(2.0)
           + aP3 * wgt(3.0) + s4 * wgt(4.0) + aP5 * wgt(5.0);

    // particles scatter mid-transition and when scrolling fast
    float tr = 1.0 - abs(fract(uMorph) * 2.0 - 1.0);
    float chaos = 0.012 + tr * 1.1 + min(abs(uScrollVel) * 0.008, 0.35);
    vec3 n = vec3(
      sin(p.y * 1.9 + uTime * 0.7 + aRand * 6.283),
      sin(p.z * 1.7 + uTime * 0.6 + aRand * 12.0),
      sin(p.x * 1.5 + uTime * 0.8 + aRand * 3.0)
    );
    p += n * chaos * (0.4 + aRand * 0.6);

    // Joy Division ridges: a central mountain that pumps with the kick
    float wr = wgt(2.0);
    float ridge = exp(-p.x * p.x * 0.35);
    float wave = sin(p.x * 3.1 + aP2.z * 7.0 + uTime * 1.6) * 0.5 + 0.5;
    p.y += wr * ridge * (wave * 0.5 + uBeat * 0.45 * (0.5 + 0.5 * sin(aP2.z * 9.0 + uTime * 3.0)));

    p *= 1.0 + uBeat * 0.07 * (0.4 + aRand);

    vec4 wp = modelMatrix * vec4(p, 1.0);

    // push particles away from the cursor
    vec2 d = wp.xy - uMouse.xy;
    float dl = length(d);
    wp.xy += (d / (dl + 0.0001)) * uMouseStrength * smoothstep(1.4, 0.0, dl) * 0.55;

    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aSize * uPixelRatio * (1.0 + uBeat * 0.6 * aRand) / -mv.z;

    vAlpha = (0.35 + 0.65 * aRand) * (0.65 + 0.35 * sin(uTime * 2.5 + aRand * 50.0));
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vec3(0.96, 0.95, 0.93), a * a * vAlpha * uOpacity * 0.55);
  }
`;

// per-scene layout: x offset (desktop) and opacity
const OFFSETS = [0, 1.9, 0, 0.3, 0, 0];
const OPACITY = [1, 1, 0.95, 1, 0.9, 0.85];

export function createScene(canvas) {
  const isSmall = () => window.innerWidth < 760;
  const count = isSmall() ? 9000 : 20000;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 1); // pure black: the composer would gamma-lift any near-black
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  // main particle system
  const geo = new THREE.BufferGeometry();
  const targets = SHAPES.map((fn) => fn(count));
  targets.forEach((arr, i) => geo.setAttribute(`aP${i}`, new THREE.BufferAttribute(arr, 3)));
  geo.setAttribute('position', new THREE.BufferAttribute(targets[0].slice(), 3));
  const rnd = new Float32Array(count), size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    rnd[i] = Math.random();
    size[i] = Math.random() < 0.03 ? 2 + Math.random() * 1.6 : 0.5 + Math.random() * 0.75;
  }
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uBeat: { value: 0 },
    uSize: { value: 15 },
    uPixelRatio: { value: 1 },
    uScrollVel: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseStrength: { value: 0 },
    uOpacity: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const group = new THREE.Group();
  group.add(new THREE.Points(geo, material));
  scene.add(group);

  // far dust that scrolls past for depth parallax
  const starCount = 1600;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 40;
    starPos[i * 3 + 1] = Math.random() * 46 - 36;
    starPos[i * 3 + 2] = -6 - Math.random() * 16;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xf3f1ec, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false,
  }));
  scene.add(stars);

  // post
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.35, 0.15);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = pr;
    group.scale.setScalar(isSmall() ? 0.68 : 1);
  }
  resize();

  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  let mouseActive = 0;

  function lerpScene(arr, m) {
    const i = Math.floor(m), f = m - i;
    const a = arr[Math.min(i, arr.length - 1)], b = arr[Math.min(i + 1, arr.length - 1)];
    return a + (b - a) * f;
  }

  function update({ time, morph, beat, mouse, scroll, scrollVel, pointerOn }) {
    const small = isSmall();
    uniforms.uTime.value = time;
    uniforms.uMorph.value = morph;
    uniforms.uBeat.value = beat;
    uniforms.uScrollVel.value = scrollVel;
    uniforms.uOpacity.value = lerpScene(OPACITY, morph) * (small ? 0.6 : 1);

    const tx = small ? 0 : lerpScene(OFFSETS, morph);
    group.position.x += (tx - group.position.x) * 0.06;
    group.rotation.y = Math.sin(time * 0.2) * 0.25 + mouse.x * 0.25;
    group.rotation.x = mouse.y * 0.12;

    camera.position.x += (mouse.x * 0.35 - camera.position.x) * 0.04;
    camera.position.y += (mouse.y * 0.25 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    stars.position.y = scroll * 0.0016;

    mouseActive += ((pointerOn ? 1 : 0) - mouseActive) * 0.08;
    uniforms.uMouseStrength.value = mouseActive;
    ndc.set(mouse.x, mouse.y);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(hit);

    bloom.strength = 0.35 + beat * 0.2;
  }

  return { update, render: () => composer.render(), resize, bloom, renderer, uniforms };
}
