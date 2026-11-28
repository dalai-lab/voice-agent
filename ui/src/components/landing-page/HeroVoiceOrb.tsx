"use client";

/*!
 * Voice orb WebGL2 Fluid Simulation
 * Based on imuvrays1/voice-orb (MIT License)
 * Enhanced for Talkar Voice AI — ElevenLabs Narration Peach Palette
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Smartphone
} from "lucide-react";
import { DemoCallForm } from "./DemoCallForm";

// ---------------------------------------------------------------------------
// Local Type Helper for DograhWidget
// ---------------------------------------------------------------------------
interface DograhWidgetInterface {
  start: () => Promise<void>;
  end: () => void;
  onStatusChange: (cb: (status: string) => void) => void;
  onCallEnd: (cb: () => void) => void;
  onError: (cb: (err: any) => void) => void;
  getState: () => {
    status?: string;
    audioElement?: HTMLAudioElement;
    stream?: MediaStream;
  };
}

function getDograhWidget(): DograhWidgetInterface | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as any).DograhWidget;
}

// ---------------------------------------------------------------------------
// WebGL2 Shaders & Navier-Stokes Fluid Dynamics
// ---------------------------------------------------------------------------
const FLUID_SIZE = 128;
const VELOCITY_KEEP = 0.25;
const OFFSET_KEEP = 0.35;
const PRESSURE_KEEP = 0.8;
const PRESSURE_ITERATIONS = 16;
const SPLAT_COUNT = 3;
const SPLAT_RING = 0.2;
const SPLAT_RADIUS = 0.006;
const SPLAT_FORCE = 9.0;

const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FLUID_HEAD = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uTexel;
`;

const FLUID_SPLAT = `${FLUID_HEAD}
uniform sampler2D uVelocity;
uniform vec4 uSplats[${SPLAT_COUNT}];
uniform float uRadius;
void main() {
  vec2 v = texture(uVelocity, vUv).xy;
  for (int i = 0; i < ${SPLAT_COUNT}; i++) {
    vec2 d = vUv - uSplats[i].xy;
    v += uSplats[i].zw * exp(-dot(d, d) / uRadius);
  }
  outColor = vec4(v, 0.0, 1.0);
}
`;

const FLUID_ADVECT = `${FLUID_HEAD}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float uDt;
uniform float uKeep;
void main() {
  vec2 back = vUv - uDt * texture(uVelocity, vUv).xy;
  outColor = texture(uSource, back) * uKeep;
}
`;

const FLUID_DIVERGENCE = `${FLUID_HEAD}
uniform sampler2D uVelocity;
void main() {
  vec2 c = texture(uVelocity, vUv).xy;
  float l = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float t = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  if (vUv.x - uTexel.x < 0.0) l = -c.x;
  if (vUv.x + uTexel.x > 1.0) r = -c.x;
  if (vUv.y - uTexel.y < 0.0) b = -c.y;
  if (vUv.y + uTexel.y > 1.0) t = -c.y;
  outColor = vec4((r - l + t - b) / (2.0 * uTexel.x), 0.0, 0.0, 1.0);
}
`;

const FLUID_PRESSURE = `${FLUID_HEAD}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float l = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float div = texture(uDivergence, vUv).x;
  outColor = vec4((l + r + b + t - uTexel.x * uTexel.x * div) * 0.25, 0.0, 0.0, 1.0);
}
`;

const FLUID_GRADIENT = `${FLUID_HEAD}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float l = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 v = texture(uVelocity, vUv).xy - vec2(r - l, t - b) / (2.0 * uTexel.x);
  outColor = vec4(v, 0.0, 1.0);
}
`;

const FLUID_SCALE = `${FLUID_HEAD}
uniform sampler2D uSource;
uniform float uKeep;
void main() {
  outColor = texture(uSource, vUv) * uKeep;
}
`;

const FLUID_CARRY = `${FLUID_HEAD}
uniform sampler2D uVelocity;
uniform sampler2D uOffset;
uniform float uDt;
uniform float uKeep;
void main() {
  vec2 v = texture(uVelocity, vUv).xy;
  vec2 d = texture(uOffset, vUv - uDt * v).xy;
  outColor = vec4((d + v * uDt) * uKeep, 0.0, 1.0);
}
`;

class FluidSimulator {
  gl: WebGL2RenderingContext;
  passes: Record<string, { program: WebGLProgram }> = {};
  state: any;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    gl.getExtension("EXT_color_buffer_float");
    const sources: Record<string, string> = {
      splat: FLUID_SPLAT,
      advect: FLUID_ADVECT,
      divergence: FLUID_DIVERGENCE,
      pressure: FLUID_PRESSURE,
      gradient: FLUID_GRADIENT,
      scale: FLUID_SCALE,
      carry: FLUID_CARRY
    };
    for (const [k, src] of Object.entries(sources)) {
      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, VERTEX_SHADER);
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, src);
      gl.compileShader(fs);
      const p = gl.createProgram()!;
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      this.passes[k] = { program: p };
    }
    this.state = this.createState(0.42);
  }

  target(internal: number, format: number) {
    const gl = this.gl;
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, FLUID_SIZE, FLUID_SIZE, 0, format, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { texture, fbo };
  }

  pair(internal: number, format: number) {
    return { read: this.target(internal, format), write: this.target(internal, format) };
  }

  createState(seed: number) {
    const gl = this.gl;
    return {
      velocity: this.pair(gl.RG16F, gl.RG),
      pressure: this.pair(gl.R16F, gl.RED),
      divergence: this.target(gl.R16F, gl.RED),
      offset: this.pair(gl.RG16F, gl.RG),
      phase: seed * 6.2831,
      quiet: 0
    };
  }

  run(name: string, outTarget: any, inputs: Record<string, WebGLTexture>, setUniforms?: (p: WebGLProgram) => void) {
    const gl = this.gl;
    const pass = this.passes[name];
    gl.useProgram(pass.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, outTarget.fbo);
    gl.uniform2f(gl.getUniformLocation(pass.program, "uTexel"), 1 / FLUID_SIZE, 1 / FLUID_SIZE);
    let unit = 0;
    for (const [uniform, tex] of Object.entries(inputs)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(pass.program, uniform), unit);
      unit++;
    }
    if (setUniforms) setUniforms(pass.program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  swap(pair: { read: any; write: any }) {
    const t = pair.read;
    pair.read = pair.write;
    pair.write = t;
  }

  step(bass: number, treble: number, dt: number, pull: boolean) {
    if (dt <= 0) return;
    const gl = this.gl;
    const state = this.state;
    gl.viewport(0, 0, FLUID_SIZE, FLUID_SIZE);
    const v = state.velocity;

    state.phase += dt * (0.35 + treble * 1.6);
    const splats = new Float32Array(SPLAT_COUNT * 4);
    const force = SPLAT_FORCE * bass * dt * (pull ? -0.8 : 1.0);
    const sway = Math.PI / 2 + Math.sin(state.phase * 0.9) * 0.9;
    for (let i = 0; i < SPLAT_COUNT; i++) {
      const a = state.phase + (i / SPLAT_COUNT) * Math.PI * 2;
      const dir = a + sway;
      splats.set([
        0.5 + Math.cos(a) * SPLAT_RING,
        0.5 + Math.sin(a) * SPLAT_RING,
        Math.cos(dir) * force,
        Math.sin(dir) * force,
      ], i * 4);
    }

    this.run("splat", v.write, { uVelocity: v.read.texture }, (p) => {
      gl.uniform4fv(gl.getUniformLocation(p, "uSplats"), splats);
      gl.uniform1f(gl.getUniformLocation(p, "uRadius"), SPLAT_RADIUS);
    });
    this.swap(v);

    this.run("advect", v.write, { uVelocity: v.read.texture, uSource: v.read.texture }, (p) => {
      gl.uniform1f(gl.getUniformLocation(p, "uDt"), dt);
      gl.uniform1f(gl.getUniformLocation(p, "uKeep"), Math.pow(VELOCITY_KEEP, dt));
    });
    this.swap(v);

    this.run("divergence", state.divergence, { uVelocity: v.read.texture });
    const press = state.pressure;
    this.run("scale", press.write, { uSource: press.read.texture }, (p) => {
      gl.uniform1f(gl.getUniformLocation(p, "uKeep"), PRESSURE_KEEP);
    });
    this.swap(press);

    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      this.run("pressure", press.write, { uPressure: press.read.texture, uDivergence: state.divergence.texture });
      this.swap(press);
    }

    this.run("gradient", v.write, { uPressure: press.read.texture, uVelocity: v.read.texture });
    this.swap(v);

    const o = state.offset;
    this.run("carry", o.write, { uVelocity: v.read.texture, uOffset: o.read.texture }, (p) => {
      gl.uniform1f(gl.getUniformLocation(p, "uDt"), dt);
      gl.uniform1f(gl.getUniformLocation(p, "uKeep"), Math.pow(OFFSET_KEEP, dt));
    });
    this.swap(o);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

// ---------------------------------------------------------------------------
// Main Fragment Shader with Voice Ripple Lighting & Shading
// ---------------------------------------------------------------------------
const PRELUDE = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uDrift;
uniform float uPulse;
uniform vec4 uBands;
uniform float uLevel;
uniform float uInput;
uniform float uThink;
uniform float uScale;
uniform float uDim;
uniform float uSeed;

uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;

uniform float uWarp;
uniform float uSphere;
uniform float uDetail;
uniform float uGrain;
uniform float uPulseAmt;
uniform float uHighlight;
uniform float uExposure;
uniform float uSaturation;

uniform sampler2D uFlow;
uniform sampler2D uFlowVelocity;
uniform float uFlowAmt;
uniform float uFlowDebug;

const float PI = 3.14159265;
const vec3 LIGHT = vec3(-0.45, 0.55, 0.70);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float grainHash(vec2 pixel, float frame) {
  uvec2 q = uvec2(ivec2(pixel)) * uvec2(1597334673u, 3812015801u);
  uint n = (q.x ^ q.y ^ (uint(frame) * 2654435761u)) * 1597334673u;
  return float(n) * (1.0 / 4294967295.0);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = r * p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}

vec2 flowUv(vec2 p) {
  return p * 0.5 + 0.5;
}

vec2 carried(vec2 p) {
  return p - texture(uFlow, flowUv(p)).xy * 2.0 * uFlowAmt;
}

vec2 sphereMap(vec2 p) {
  float z = sqrt(max(1.0 - dot(p, p), 0.0));
  return p / (1.0 + uSphere * z);
}

struct Ball {
  vec2 p;
  vec2 uv;
  vec3 n;
  float r;
  float mask;
};

Ball ball() {
  Ball b;
  b.p = (vUv - 0.5) * 2.0 / uScale;
  b.r = length(b.p);
  float aa = max(fwidth(b.r) * 1.25, 1e-4);
  b.mask = 1.0 - smoothstep(1.0 - aa, 1.0, b.r);
  float z = sqrt(max(1.0 - b.r * b.r, 0.0));
  b.n = vec3(b.p, z);
  b.uv = sphereMap(carried(b.p));

  // Concentric sound wave ripples (low-mid band) & bass breathing
  float ph = fract(b.r * 1.35 - uPulse);
  float wave = sin(ph * 2.0 * PI) * smoothstep(0.0, 0.2, ph) * (1.0 - smoothstep(0.55, 1.0, ph));
  vec2 dir = b.r > 1e-4 ? b.p / b.r : vec2(0.0);
  b.uv += dir * wave * uBands.y * uPulseAmt * 0.075 * smoothstep(0.05, 0.3, b.r);
  b.uv *= 1.0 - uBands.x * 0.06;
  return b;
}

float fbmSoft(vec2 p) {
  return vnoise(p) * 0.66 + vnoise(p * 2.1 + 17.1) * 0.34;
}

float softLight(vec2 w, vec2 p, float size, float angle, float stretch) {
  vec2 d = w - p;
  float c = cos(angle);
  float s = sin(angle);
  d = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  d.y *= stretch;
  return exp(-dot(d, d) * size);
}

vec3 field(vec2 uv, float t) {
  vec2 s = vec2(uSeed * 13.7, uSeed * 7.3);
  vec2 q = vec2(
    fbmSoft(uv * uDetail + s + vec2(0.0, t * 0.11)),
    fbmSoft(uv * uDetail + s + vec2(5.2, -t * 0.09))
  ) - 0.5;
  vec2 w = uv + q * uWarp * 1.3;
  vec2 q2 = vec2(
    fbmSoft(w * uDetail * 2.2 + s + vec2(t * 0.07, 3.1)),
    fbmSoft(w * uDetail * 2.2 + s + vec2(9.2, -t * 0.06))
  ) - 0.5;
  w += q2 * uWarp * 0.5;

  float a = uSeed * 6.2831;
  vec3 col = mix(uC1, uC2, 0.3);
  col = mix(col, uC0, softLight(w, vec2(cos(t * 0.21 + a), sin(t * 0.17 + a * 1.3)) * 0.55, 2.0, t * 0.05 + a, 1.4) * 0.9);
  col = mix(col, mix(uC0, uC1, 0.5), softLight(w, vec2(cos(t * 0.15 + a + 1.0), sin(t * 0.19 + a + 2.2)) * 0.45, 4.0, -t * 0.07 + a * 2.0, 2.6) * 0.8);
  col = mix(col, uC2, softLight(w, vec2(cos(t * 0.17 + a + 2.1), sin(t * 0.21 + a + 1.4)) * 0.5, 2.4, t * 0.04 + 1.1, 1.2) * 0.85);
  col = mix(col, uC2, softLight(w, vec2(cos(t * 0.25 + a + 3.3), sin(t * 0.13 + a + 4.4)) * 0.4, 6.0, t * 0.09 + a + 0.6, 3.0) * 0.75);
  col = mix(col, uC3, softLight(w, vec2(cos(t * 0.29 + a + 4.0), sin(t * 0.25 + a + 3.3)) * 0.42, 5.0, -t * 0.06 + 2.0, 1.6) * 0.8);
  col = mix(col, uC3, softLight(w, vec2(cos(t * 0.19 + a + 5.1), sin(t * 0.23 + a + 0.6)) * 0.35, 11.0, t * 0.08 + a, 2.2) * 0.85);
  col *= 0.94 + 0.12 * fbmSoft(w * 1.4 + s + t * 0.05);
  return col;
}

float diffuse(vec3 n) {
  return clamp(dot(n, normalize(LIGHT)), 0.0, 1.0);
}

vec3 voiceLight(Ball b) {
  float ph = fract(b.r * 1.35 - uPulse);
  float ring = smoothstep(0.0, 0.16, ph) * (1.0 - smoothstep(0.16, 0.5, ph));
  ring *= (1.0 - 0.55 * b.r) * smoothstep(0.05, 0.3, b.r);
  vec3 c = uC2 * ring * uBands.y * uPulseAmt * 0.16;

  float ang = atan(b.p.y, b.p.x);
  float aim = uDrift * 0.7 + uSeed * 6.0 - uInput * 1.2;
  float da = abs(mod(ang - aim + PI, 2.0 * PI) - PI);
  float arc = exp(-da * da * 2.6) * smoothstep(0.5, 0.9, b.r) * (1.0 - smoothstep(0.94, 1.0, b.r));
  float drive = clamp(uBands.w * 2.4 + uThink * 0.6 + uInput * 0.8, 0.0, 1.0);
  c += mix(uC2, uC3, 0.75) * arc * drive * uHighlight * 1.2;
  return c;
}

vec3 finish(vec3 col) {
  float g = grainHash(gl_FragCoord.xy, floor(uTime * 24.0)) - 0.5;
  col += g * uGrain * 0.35;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSaturation * (1.0 - uDim * 0.22));
  col *= 1.0 + uExposure - uDim * 0.05;
  return clamp(col, 0.0, 1.0);
}

void emit(vec3 col, float alpha) {
  outColor = vec4(col * alpha, alpha);
}

void main() {
  Ball b = ball();
  if (b.mask <= 0.0) { outColor = vec4(0.0); return; }
  vec3 col = field(b.uv, uDrift);
  col *= mix(0.84, 1.10, diffuse(b.n));
  float rim = pow(1.0 - b.n.z, 2.2);
  col = mix(col, uC0, rim * 0.22);
  vec3 h = normalize(normalize(LIGHT) + vec3(0.0, 0.0, 1.0));
  col += uC3 * pow(clamp(dot(b.n, h), 0.0, 1.0), 9.0) * 0.16;
  col += voiceLight(b);
  emit(finish(col), b.mask);
}
`;

// Tuned ElevenLabs "Narration" Peach Orange Palette
const PALETTE_COLORS = [
  "#b82e0d", // Dark/Deep terracotta shadow
  "#e8562c", // Paprika coral mid-tone
  "#f69458", // Peach tangerine light
  "#fed192"  // Champagne peach glint
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

// ---------------------------------------------------------------------------
// Audio Band Spectrum & Simulated Voice Generators (Pure functions outside component)
// ---------------------------------------------------------------------------
const EDGES = [90, 350, 1100, 2800, 7000];

function processBandSpectrum(
  analyser: AnalyserNode,
  dataArray: Float32Array,
  floorArr: number[],
  peakArr: number[],
  envArr: number[],
  dt: number
) {
  analyser.getFloatFrequencyData(dataArray);
  const hzPerBin = analyser.context.sampleRate / analyser.fftSize;
  const bRes = [0, 0, 0, 0];

  for (let b = 0; b < 4; b++) {
    const from = Math.max(1, Math.floor(EDGES[b] / hzPerBin));
    const to = Math.min(dataArray.length, Math.ceil(EDGES[b + 1] / hzPerBin));
    let sum = 0;
    for (let i = from; i < to; i++) {
      sum += Math.pow(10, dataArray[i] / 10);
    }
    const avgPower = sum / Math.max(1, to - from);
    const db = 10 * Math.log10(Math.max(1e-12, avgPower));
    const raw = Math.min(1, Math.max(0, (db - (-95)) / ((-20) - (-95))));

    floorArr[b] = Math.min(raw, floorArr[b] + dt * 0.15);
    peakArr[b] = Math.max(raw, peakArr[b] - dt * 0.05);
    const span = Math.max(0.14, peakArr[b] - floorArr[b]);
    const norm = Math.min(1, Math.max(0, (raw - floorArr[b]) / span));

    const rate = norm > envArr[b] ? 28 : 8;
    envArr[b] += (norm - envArr[b]) * (1 - Math.exp(-dt * rate));
    bRes[b] = envArr[b];
  }
  return bRes;
}

function computeSimulatedVoice(simTime: number, simEnv: number[], dt: number) {
  const t = simTime;
  const cycle = 2.6 + ((Math.sin(Math.floor(t / 2.6) * 12.9898) * 43758.5453) % 1) * 0.8;
  const phase = (t % cycle) / cycle;
  const gate = (phase < 0.06 ? phase / 0.06 : 1.0) * (phase > 0.8 ? (1.0 - phase) / 0.2 : 1.0);
  const rate = 4.6 + ((Math.sin(t * 0.5 * 12.9898) * 43758.5453) % 1) * 1.6;
  const syllable = Math.pow(Math.max(0, Math.sin(t * rate * Math.PI * 2)), 1.6);
  const env = Math.min(1.0, gate * syllable * 2.2);

  const target = [
    env * 0.85,
    env * 0.90,
    env * 0.60,
    env * 0.70
  ];

  for (let b = 0; b < 4; b++) {
    const rateK = target[b] > simEnv[b] ? 28 : 8;
    simEnv[b] += (target[b] - simEnv[b]) * (1 - Math.exp(-dt * rateK));
  }
  const lvl = Math.min(1.0, simEnv[0] * 0.32 + simEnv[1] * 0.36 + simEnv[2] * 0.22 + simEnv[3] * 0.1);
  return { bands: simEnv, level: lvl };
}

export const HeroVoiceOrb: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"web" | "phone">("phone");
  const [callState, setCallState] = useState<"ready" | "connecting" | "connected">("ready");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Context & Analyser Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micDataRef = useRef<Float32Array | null>(null);
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const agentDataRef = useRef<Float32Array | null>(null);

  // Audio tracking arrays
  const callerFloorRef = useRef([1, 1, 1, 1]);
  const callerPeakRef = useRef([0, 0, 0, 0]);
  const callerEnvRef = useRef([0, 0, 0, 0]);
  const agentFloorRef = useRef([1, 1, 1, 1]);
  const agentPeakRef = useRef([0, 0, 0, 0]);
  const agentEnvRef = useRef([0, 0, 0, 0]);

  // Simulated Voice Generator
  const simTimeRef = useRef(7.31);
  const simEnvRef = useRef([0, 0, 0, 0]);

  // Current animation state targets
  const curRef = useRef({
    time: 0,
    drift: 16.8,
    pulse: 0,
    speed: 1.5,
    think: 0.0,
    dim: 0.0,
    scale: 0.96,
    bands: [0, 0, 0, 0],
    level: 0,
    input: 0,
    talk: 0
  });

  // Inject Headless Dograh Widget script once
  useEffect(() => {
    const SCRIPT_ID = "talkar-dograh-embed";
    if (typeof window !== "undefined" && !document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://talkar.in/embed/dograh-widget.js?token=emb_bZYegK-7S7oPR68QS3bR_6tDaV_CSRHtIbGRXS4_A6Y&environment=production&apiEndpoint=https://talkar.in";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Hook DograhWidget event callbacks
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    const bindWidget = () => {
      const widget = getDograhWidget();
      if (widget) {
        widget.onStatusChange((status: string) => {
          if (status === "connected") setCallState("connected");
          else if (status === "connecting") setCallState("connecting");
          else setCallState("ready");
        });
        widget.onCallEnd(() => setCallState("ready"));
        widget.onError((err: any) => {
          console.error("[Talkar Orb Error]:", err);
          setCallState("ready");
        });
        return true;
      }
      return false;
    };

    if (!bindWidget()) {
      checkInterval = setInterval(() => {
        if (bindWidget()) clearInterval(checkInterval);
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // Call duration counter
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callState]);

  // Audio initializers
  const initUserAudio = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (audioCtxRef.current) {
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);
        micAnalyserRef.current = analyser;
        micDataRef.current = new Float32Array(analyser.frequencyBinCount);
      }
    } catch (err) {
      console.warn("Mic permission skipped or unavailable:", err);
    }
  }, []);

  // Hook WebRTC agent audio output if available
  const tryHookAgentAudio = useCallback(() => {
    if (agentAnalyserRef.current) return;
    if (typeof window === "undefined") return;
    const widget = getDograhWidget();
    const audioEl = (document.getElementById("dograh-widget-audio") as HTMLAudioElement) ||
                    widget?.getState()?.audioElement;
    if (audioEl && audioEl.srcObject) {
      try {
        if (!audioCtxRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current) {
          const src = audioCtxRef.current.createMediaStreamSource(audioEl.srcObject as MediaStream);
          const analyser = audioCtxRef.current.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.3;
          src.connect(analyser);
          agentAnalyserRef.current = analyser;
          agentDataRef.current = new Float32Array(analyser.frequencyBinCount);
        }
      } catch (e) {
        console.warn("Could not hook WebRTC audio element directly:", e);
      }
    }
  }, []);

  // Main WebGL2 Canvas Render Loop
  useEffect(() => {
    if (activeTab !== "web") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: "high-performance"
    });
    if (!gl) return;

    // Compile main shader program
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, PRELUDE);
    gl.compileShader(fs);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const fluidSim = new FluidSimulator(gl);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let lastTime = performance.now();
    const DRIFT_RATE = 1.05;

    const render = (timeMs: number) => {
      const dt = Math.min((timeMs - lastTime) / 1000, 0.05);
      lastTime = timeMs;

      // Handle Retina resolution
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayW = Math.floor(canvas.clientWidth * dpr);
      const displayH = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
      }

      tryHookAgentAudio();

      const currentCallState = callStateRef.current;

      // Read audio levels
      let callerLvl = 0;
      let agentLvl = 0;
      let activeBands = [0, 0, 0, 0];

      if (micAnalyserRef.current && micDataRef.current && currentCallState === "connected") {
        const b = processBandSpectrum(micAnalyserRef.current, micDataRef.current, callerFloorRef.current, callerPeakRef.current, callerEnvRef.current, dt);
        callerLvl = Math.min(1, b[0] * 0.32 + b[1] * 0.36 + b[2] * 0.22 + b[3] * 0.1);
      }

      if (agentAnalyserRef.current && agentDataRef.current && currentCallState === "connected") {
        activeBands = processBandSpectrum(agentAnalyserRef.current, agentDataRef.current, agentFloorRef.current, agentPeakRef.current, agentEnvRef.current, dt);
        agentLvl = Math.min(1, activeBands[0] * 0.32 + activeBands[1] * 0.36 + activeBands[2] * 0.22 + activeBands[3] * 0.1);
      } else if (currentCallState === "connected" && callerLvl < 0.15) {
        simTimeRef.current += dt;
        const sim = computeSimulatedVoice(simTimeRef.current, simEnvRef.current, dt);
        activeBands = sim.bands;
        agentLvl = sim.level;
      }

      // State speed & animation target interpolation
      const targetSpeed = currentCallState === "connected" ? (agentLvl > 0.1 ? 3.4 : 1.8) : (currentCallState === "connecting" ? 2.8 : 1.5);
      const targetThink = currentCallState === "connecting" ? 1.0 : 0.0;
      const targetInput = Math.min(1.0, callerLvl * 1.8);
      const targetTalk = Math.min(1.0, agentLvl * 1.8);

      const cur = curRef.current;
      cur.time += dt;
      cur.speed += (targetSpeed - cur.speed) * (1 - Math.exp(-dt * 3.5));
      cur.think += (targetThink - cur.think) * (1 - Math.exp(-dt * 3.5));
      cur.input += (targetInput - cur.input) * (1 - Math.exp(-dt * 8.0));
      cur.talk += (targetTalk - cur.talk) * (1 - Math.exp(-dt * 8.0));

      const bass = Math.max(activeBands[0], cur.input * 0.8);
      const treble = Math.max(activeBands[3], cur.talk * 0.6);
      cur.drift += dt * cur.speed * DRIFT_RATE;
      cur.pulse += dt * (0.45 + (1.1 - 0.45) * Math.min(1, (bass + treble) * 0.5));

      for (let b = 0; b < 4; b++) {
        cur.bands[b] += (activeBands[b] - cur.bands[b]) * (1 - Math.exp(-dt * 15.0));
      }
      cur.level = Math.max(agentLvl, callerLvl);

      // Step GPU fluid dynamics
      fluidSim.step(bass * 1.4, treble * 1.2, dt, false);

      // Render main orb
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(gl.getUniformLocation(prog, "uResolution"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(prog, "uTime"), cur.time);
      gl.uniform1f(gl.getUniformLocation(prog, "uDrift"), cur.drift);
      gl.uniform1f(gl.getUniformLocation(prog, "uPulse"), cur.pulse);
      gl.uniform4fv(gl.getUniformLocation(prog, "uBands"), cur.bands);
      gl.uniform1f(gl.getUniformLocation(prog, "uLevel"), cur.level);
      gl.uniform1f(gl.getUniformLocation(prog, "uInput"), cur.input);
      gl.uniform1f(gl.getUniformLocation(prog, "uThink"), cur.think);
      gl.uniform1f(gl.getUniformLocation(prog, "uScale"), cur.scale);
      gl.uniform1f(gl.getUniformLocation(prog, "uDim"), cur.dim);
      gl.uniform1f(gl.getUniformLocation(prog, "uSeed"), 0.42);

      // Supply tuned ElevenLabs Narration palette
      const c0 = hexToRgb(PALETTE_COLORS[0]);
      const c1 = hexToRgb(PALETTE_COLORS[1]);
      const c2 = hexToRgb(PALETTE_COLORS[2]);
      const c3 = hexToRgb(PALETTE_COLORS[3]);
      gl.uniform3fv(gl.getUniformLocation(prog, "uC0"), c0);
      gl.uniform3fv(gl.getUniformLocation(prog, "uC1"), c1);
      gl.uniform3fv(gl.getUniformLocation(prog, "uC2"), c2);
      gl.uniform3fv(gl.getUniformLocation(prog, "uC3"), c3);

      gl.uniform1f(gl.getUniformLocation(prog, "uWarp"), 0.5);
      gl.uniform1f(gl.getUniformLocation(prog, "uSphere"), 0.45);
      gl.uniform1f(gl.getUniformLocation(prog, "uDetail"), 0.95);
      gl.uniform1f(gl.getUniformLocation(prog, "uGrain"), 0.08);
      gl.uniform1f(gl.getUniformLocation(prog, "uPulseAmt"), 0.55);
      gl.uniform1f(gl.getUniformLocation(prog, "uHighlight"), 0.45);
      gl.uniform1f(gl.getUniformLocation(prog, "uExposure"), 0.04);
      gl.uniform1f(gl.getUniformLocation(prog, "uSaturation"), 1.05);

      // Bind GPU Fluid textures
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fluidSim.state.offset.read.texture);
      gl.uniform1i(gl.getUniformLocation(prog, "uFlow"), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fluidSim.state.velocity.read.texture);
      gl.uniform1i(gl.getUniformLocation(prog, "uFlowVelocity"), 1);

      gl.uniform1f(gl.getUniformLocation(prog, "uFlowAmt"), 0.85);
      gl.uniform1f(gl.getUniformLocation(prog, "uFlowDebug"), 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, tryHookAgentAudio]);

  // Toggle Call Handler
  const handleToggleCall = async () => {
    const widget = getDograhWidget();
    if (!widget) {
      alert("Initializing AI voice engine. Please wait a moment...");
      return;
    }

    if (callState === "connected" || callState === "connecting") {
      widget.end();
      setCallState("ready");
    } else {
      setCallState("connecting");
      try {
        await initUserAudio();
        await widget.start();
      } catch (err) {
        console.error("Call start error:", err);
        setCallState("ready");
      }
    }
  };

  // Toggle Mute Handler
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    const widget = getDograhWidget();
    if (widget?.getState()?.stream) {
      widget.getState().stream?.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
    }
  };

  // Format call duration helper (MM:SS)
  const formatTimer = (totalSecs: number) => {
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, "0");
    const secs = String(totalSecs % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="w-full max-w-[540px] h-auto min-h-[480px] lg:h-[540px] lg:aspect-square mx-auto flex flex-col justify-between relative bg-transparent border-0 shadow-none">
      {/* Top Header: Minimal Segmented Switcher & Call Timer */}
      <div className="w-full flex items-center justify-between pb-3 z-10 shrink-0">
        <div className="inline-flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab("phone")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "phone"
                ? "bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white shadow-md shadow-orange-500/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Call My Phone</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("web")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === "web"
                ? "bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white shadow-md shadow-orange-500/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Radio className={`w-3 h-3 ${activeTab === "web" && callState === "connected" ? "animate-pulse" : ""}`} />
            <span>Speak Live</span>
          </button>
        </div>

        {activeTab === "web" && callState === "connected" && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-medium tracking-wide text-emerald-400 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{formatTimer(callDuration)}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Live Interactive Voice Orb (Exact same fixed dimensions as Call My Phone) */}
      {activeTab === "web" ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-between z-10 py-2 relative">
          {/* Ambient Warm Glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] rounded-full pointer-events-none z-0 transition-opacity duration-700"
            style={{
              background: "radial-gradient(circle, rgba(232, 86, 44, 0.28) 0%, rgba(246, 148, 88, 0.12) 40%, rgba(254, 209, 146, 0.04) 65%, transparent 72%)",
              filter: "blur(65px)",
              opacity: callState === "connected" ? 1.0 : 0.7
            }}
          />

          {/* Centered Voice Orb */}
          <div className="flex-1 flex items-center justify-center relative z-10 my-auto">
            <div
              onClick={handleToggleCall}
              className="relative cursor-pointer group transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              <canvas
                ref={canvasRef}
                className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-full drop-shadow-2xl"
              />

              {/* Center Play Icon Overlay (ElevenLabs inspired clean white badge) */}
              {callState === "ready" && (
                <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white text-zinc-900 shadow-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all pointer-events-none">
                  <svg className="w-5 h-5 ml-0.5 fill-current text-zinc-900" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button Controls (Consistent h-11 button sizes, zero layout shifts, subtle minimal connecting) */}
          <div className="h-12 w-full flex items-center justify-center z-10 shrink-0">
            {callState !== "connected" ? (
              <button
                type="button"
                onClick={handleToggleCall}
                disabled={callState === "connecting"}
                className={`h-11 px-7 rounded-full text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white ${
                  callState === "connecting"
                    ? "opacity-80 cursor-wait"
                    : "shadow-md shadow-orange-600/20 hover:opacity-95 active:scale-95 cursor-pointer"
                }`}
              >
                {callState === "connecting" ? (
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                    <span>Connecting...</span>
                  </span>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-white" />
                    <span>Start Live Call</span>
                  </>
                )}
              </button>
            ) : (
              <div className="h-11 flex items-center gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`h-11 px-4 rounded-full text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md ${
                    isMuted
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-white/[0.06] border-white/10 text-gray-200 hover:bg-white/[0.1]"
                  }`}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isMuted ? "Unmute" : "Mute"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleCall}
                  className="h-11 px-6 rounded-full text-xs font-semibold bg-rose-600/90 hover:bg-rose-600 text-white shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Outbound Telephony Phone Demo Form */
        <div className="w-full flex-1 min-h-0">
          <DemoCallForm />
        </div>
      )}
    </div>
  );
};
