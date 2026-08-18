import * as React from "react"
import { useEffect, useRef } from "react"
import { animate, motionValue } from "motion"

type FontValue = {
  fontFamily?: string
  fontSize?: string | number
  fontWeight?: string | number
  fontStyle?: string
  letterSpacing?: string | number
  lineHeight?: string | number
  variant?: string
  textAlign?: string
}

type BackdropGroup = {
  type?: "None" | "Image" | "Video" | "Text"
  image?: string
  video?: string
  text?: string
  font?: FontValue
  textColor?: string
}

type GlassGroup = {
  tint?: string
  chromatic?: number
  frost?: number
}

export type GlassIconProps = {
  width?: number
  height?: number
  style?: React.CSSProperties
  background?: string
  shape?: "X" | "Torus" | "Sphere" | "Logo"
  logo?: string
  depth?: number
  size?: number
  speed?: number
  direction?: "Clockwise" | "Counterclockwise"
  backdrop?: BackdropGroup
  glass?: GlassGroup
}

const BEVEL = 0.025
const CORE_REFRACT = 1.0
const IOR = 1.5
const THICKNESS = 2.0
const TILT_RANGE = 0.5
const SPIN_YAW = 0.5
const SPIN_PITCH = 0.2
const FOV = (45 * Math.PI) / 180
const CAM_DIST = 5

const TILT_EASING = {
  type: "tween" as const,
  duration: 0.6,
  ease: [0, 0, 0.58, 1] as [number, number, number, number],
}

const DUMMY_BACKDROP =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

function parseColor(input: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!input) return fallback
  const s = input.trim()
  if (s[0] === "#") {
    let h = s.slice(1)
    if (h.length === 3 || h.length === 4)
      h = h.split("").map((c) => c + c).join("")
    if (h.length >= 6) {
      const r = parseInt(h.slice(0, 2), 16) / 255
      const g = parseInt(h.slice(2, 4), 16) / 255
      const b = parseInt(h.slice(4, 6), 16) / 255
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b]
    }
    return fallback
  }
  const m = s.match(/rgba?\(([^)]+)\)/i)
  if (m) {
    const p = m[1].split(",").map((v) => parseFloat(v))
    if (p.length >= 3) return [p[0] / 255, p[1] / 255, p[2] / 255]
  }
  return fallback
}

function numOf(v: string | number | undefined, fallback: number): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback
  if (typeof v === "string") {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function srcOf(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === "string") return v
  const s = (v as { src?: unknown }).src
  return typeof s === "string" ? s : undefined
}

function rotYX(yaw: number, pitch: number): Float32Array {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cx = Math.cos(pitch)
  const sx = Math.sin(pitch)
  const m = new Float32Array(9)
  m[0] = cy; m[1] = 0; m[2] = -sy
  m[3] = sy * sx; m[4] = cx; m[5] = cy * sx
  m[6] = sy * cx; m[7] = -sx; m[8] = cy * cx
  return m
}

function transpose3(m: Float32Array): Float32Array {
  const o = new Float32Array(9)
  o[0] = m[0]; o[1] = m[3]; o[2] = m[6]
  o[3] = m[1]; o[4] = m[4]; o[5] = m[7]
  o[6] = m[2]; o[7] = m[5]; o[8] = m[8]
  return o
}

function buildEnvCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Dark rich studio background with subtle ambient tint
  ctx.fillStyle = "#0d0f18"
  ctx.fillRect(0, 0, 1024, 512)

  const softbox = (x: number, y: number, w: number, h: number, colors: [string, string]) => {
    const grd = ctx.createLinearGradient(x, y, x + w * 0.5, y + h)
    grd.addColorStop(0, colors[0])
    grd.addColorStop(1, colors[1])
    ctx.fillStyle = grd
    ctx.shadowColor = colors[0]
    ctx.shadowBlur = 90
    ctx.beginPath()
    const rr = (ctx as any).roundRect
    if (typeof rr === "function") rr.call(ctx, x, y, w, h, 60)
    else ctx.rect(x, y, w, h)
    ctx.fill()
  }

  // Left vibrant softbox - Cyan / Violet iridescent studio light
  softbox(40, 80, 320, 340, ["rgba(0, 240, 255, 0.95)", "rgba(140, 0, 255, 0.4)"])
  // Right vibrant softbox - Magenta / Pink studio light
  softbox(664, 80, 320, 340, ["rgba(255, 0, 150, 0.95)", "rgba(255, 180, 0, 0.4)"])
  // Top softbox - Crisp White keylight highlight
  softbox(340, -40, 344, 160, ["rgba(255, 255, 255, 1.0)", "rgba(200, 230, 255, 0.5)"])

  ctx.shadowBlur = 0
  return canvas
}

const FULLSCREEN_VS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const PLATE_FS = `
precision highp float;
uniform sampler2D uPlate;
uniform vec2 uPlateFit;
uniform vec2 uRes;
void main() {
    vec2 uv = (gl_FragCoord.xy / uRes - 0.5) * uPlateFit + 0.5;
    gl_FragColor = texture2D(uPlate, clamp(uv, 0.0, 1.0));
}`

const GLASS_FS = `
precision highp float;

uniform vec2 uRes;
uniform float uAspect;
uniform float uTanHalf;

uniform sampler2D uPlate;
uniform vec2 uPlateFit;
uniform float uHasPlate;
uniform sampler2D uEnv;
uniform sampler2D uSDF;

uniform mat3 uRot;
uniform mat3 uRotT;
uniform vec3 uCenter;
uniform float uScale;
uniform float uBoundR;

uniform float uShape;
uniform float uHalfDepth;
uniform float uBevel;
uniform float uTorusTube;
uniform vec2 uLogoHalf;
uniform float uSdfUnits;

uniform float uDisp;
uniform float uFrost;
uniform vec3 uTint;

const float PI = 3.14159265359;
const float CORE_REFRACT = ${CORE_REFRACT.toFixed(4)};
const float IOR = ${IOR.toFixed(4)};
const float THICKNESS = ${THICKNESS.toFixed(4)};

float sdCross(vec2 p, vec2 b) {
    p = abs(p);
    p = (p.y > p.x) ? p.yx : p.xy;
    vec2 q = p - b;
    float k = max(q.y, q.x);
    vec2 w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
    return sign(k) * length(max(w, 0.0));
}

vec2 r45(vec2 p) {
    const float c = 0.7071067811865476;
    return vec2((p.x + p.y) * c, (p.y - p.x) * c);
}

float sdLogo(vec2 p) {
    vec2 uv = p / (2.0 * uLogoHalf) + 0.5;
    uv.y = 1.0 - uv.y;
    vec2 e = abs(p) - uLogoHalf;
    float dBox = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
    float dTex = (0.5 - texture2D(uSDF, clamp(uv, 0.0, 1.0)).r) * 2.0 * uSdfUnits;
    return max(dTex, dBox);
}

float extrudeRound(float d2, float pz, float hd, float r) {
    vec2 q = vec2(d2 + r, abs(pz) - hd + r);
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float map(vec3 p) {
    if (uShape < 0.5) {
        return extrudeRound(sdCross(r45(p.xy), vec2(1.3, 0.35)), p.z, uHalfDepth, uBevel);
    } else if (uShape < 1.5) {
        vec2 q = vec2(length(p.xy) - 0.8, p.z);
        return length(q) - uTorusTube;
    } else if (uShape < 2.5) {
        return length(p) - 1.2;
    }
    return extrudeRound(sdLogo(p.xy), p.z, uHalfDepth, uBevel);
}

vec3 mapNormal(vec3 p) {
    const float e = 0.0015;
    vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * map(p + k.xyy * e) +
        k.yyx * map(p + k.yyx * e) +
        k.yxy * map(p + k.yxy * e) +
        k.xxx * map(p + k.xxx * e)
    );
}

vec4 plate(vec2 screenUv) {
    if (uHasPlate < 0.5) return vec4(0.0);
    vec2 uv = (screenUv - 0.5) * uPlateFit + 0.5;
    return texture2D(uPlate, clamp(uv, 0.0, 1.0));
}

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 screenUv = gl_FragCoord.xy / uRes;
    vec2 ndc = screenUv * 2.0 - 1.0;

    vec3 D = normalize(vec3(ndc.x * uTanHalf * uAspect, ndc.y * uTanHalf, -1.0));
    vec3 rd = normalize(uRotT * D);
    vec3 ro = (uRotT * -uCenter) / uScale;

    float bb = dot(ro, rd);
    float cc = dot(ro, ro) - uBoundR * uBoundR;
    float hh = bb * bb - cc;
    if (hh < 0.0) discard;
    hh = sqrt(hh);
    float t = max(-bb - hh, 0.0);
    float tMax = -bb + hh;

    bool hit = false;
    for (int i = 0; i < 80; i++) {
        if (t > tMax) break;
        float d = map(ro + rd * t);
        if (d < 0.0009) { hit = true; break; }
        t += d * 0.9;
    }
    if (!hit) discard;

    vec3 pObj = ro + rd * t;
    vec3 nObj = mapNormal(pObj);

    vec3 vP = uCenter + uScale * (uRot * pObj);
    vec3 normal = normalize(uRot * nObj);
    vec3 viewDir = normalize(-vP);

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.5);
    float coreFactor = pow(max(dot(normal, viewDir), 0.0), 2.0);
    vec2 lensOffset = (screenUv - 0.5) * (CORE_REFRACT * 0.15) * coreFactor;

    vec3 refractView = refract(-viewDir, normal, 1.0 / IOR);
    vec2 offset = refractView.xy * (THICKNESS * 0.1) - lensOffset;

    vec3 reflectDir = reflect(-viewDir, normal);
    vec2 equirectUv = vec2(
        atan(reflectDir.z, reflectDir.x) / (2.0 * PI) + 0.5,
        asin(clamp(reflectDir.y, -1.0, 1.0)) / PI + 0.5
    );
    
    // Per-channel dispersion offset for environment reflection (Iridescent Holo Sheen)
    float dispAmount = uDisp * 0.08;
    vec3 reflection;
    reflection.r = texture2D(uEnv, equirectUv + vec2(dispAmount, 0.0)).r;
    reflection.g = texture2D(uEnv, equirectUv).g;
    reflection.b = texture2D(uEnv, equirectUv - vec2(dispAmount, 0.0)).b;
    reflection *= 2.6;

    // Spectral rainbow rim effect (Holographic edge dispersion)
    vec3 holoRim = 0.5 + 0.5 * cos(PI * 2.0 * (fresnel * vec3(1.0, 1.0, 1.0) + vec3(0.0, 0.33, 0.67)));
    reflection += holoRim * fresnel * uDisp * 1.2;

    vec3 transmission = vec3(0.0);
    float bgAlpha = 0.0;

    vec2 uvR = screenUv + offset * (1.0 + uDisp);
    vec2 uvG = screenUv + offset;
    vec2 uvB = screenUv + offset * (1.0 - uDisp);

    if (uFrost > 0.001) {
        float rnd = rand(screenUv) * 6.2831853;
        const int SAMPLES = 24;
        const float GOLDEN_ANGLE = 2.39996323;
        float radius = 0.0;
        float radiusStep = 1.0 / float(SAMPLES);
        float blurMultiplier = uFrost * 0.025;
        for (int i = 0; i < SAMPLES; i++) {
            float theta = float(i) * GOLDEN_ANGLE + rnd;
            radius += radiusStep;
            vec2 bo = vec2(cos(theta), sin(theta)) * radius * blurMultiplier;
            transmission.r += plate(uvR + bo).r;
            vec4 g = plate(uvG + bo);
            transmission.g += g.g;
            bgAlpha += g.a;
            transmission.b += plate(uvB + bo).b;
        }
        transmission /= float(SAMPLES);
        bgAlpha /= float(SAMPLES);
    } else {
        transmission.r = plate(uvR).r;
        vec4 g = plate(uvG);
        transmission.g = g.g;
        bgAlpha = g.a;
        transmission.b = plate(uvB).b;
    }

    transmission *= uTint;
    vec3 clearGlassTint = mix(uTint, reflection, 0.65);
    transmission = mix(clearGlassTint, transmission, bgAlpha);

    vec3 finalColor = mix(transmission, reflection, fresnel * 0.85);
    float baseAlpha = max(0.35, fresnel * 0.9);
    float outAlpha = mix(baseAlpha, 1.0, bgAlpha);

    gl_FragColor = vec4(finalColor, outAlpha);
}`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("GlassIcon shader compilation error:", gl.getShaderInfoLog(s))
    gl.deleteShader(s)
    return null
  }
  return s
}

function link(gl: WebGLRenderingContext, vs: string, fs: string) {
  const v = compile(gl, gl.VERTEX_SHADER, vs)
  const f = compile(gl, gl.FRAGMENT_SHADER, fs)
  if (!v || !f) return null
  const p = gl.createProgram()!
  gl.attachShader(p, v)
  gl.attachShader(p, f)
  gl.linkProgram(p)
  gl.deleteShader(v)
  gl.deleteShader(f)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn("GlassIcon link error:", gl.getProgramInfoLog(p))
    return null
  }
  return p
}

const DEFAULT_FONT: FontValue = {
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontSize: 96,
  fontWeight: 700,
  fontStyle: "normal",
  letterSpacing: 0,
  lineHeight: 1.1,
}

const DEFAULT_BACKDROP: Required<BackdropGroup> = {
  type: "Image",
  image: DUMMY_BACKDROP,
  video: "",
  text: "LIQUID\nGLASS",
  font: DEFAULT_FONT,
  textColor: "#FFFFFF",
}

const DEFAULT_GLASS: Required<GlassGroup> = {
  tint: "#FFFFFF",
  chromatic: 25,
  frost: 50,
}

const BACKDROP_PROP_DEFAULT: BackdropGroup = {
  font: {
    variant: "Regular",
    fontSize: "120px",
    fontStyle: "normal",
    textAlign: "left",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: 0,
  },
  text: "GLASS\nICON",
  type: "Text",
  image: DUMMY_BACKDROP,
  video: "",
  textColor: "#FFFFFF",
}

const GLASS_PROP_DEFAULT: GlassGroup = {
  tint: "#FFFFFF",
  frost: 50,
  chromatic: 79,
}

const SDF_PAD = 24
const SDF_SPREAD = 32

function edt1d(f: Float32Array, d: Float32Array, v: Int32Array, z: Float32Array, n: number) {
  let k = 0
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

function edt2d(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e20
  const grid = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) grid[i] = mask[i] ? 0 : INF
  const n = Math.max(w, h)
  const f = new Float32Array(n)
  const d = new Float32Array(n)
  const v = new Int32Array(n)
  const z = new Float32Array(n + 1)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x]
    edt1d(f, d, v, z, h)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]
    edt1d(f, d, v, z, w)
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x]
  }
  return grid
}

function bakeSDF(alpha: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const inside = new Uint8Array(w * h)
  const outside = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const on = alpha[i * 4 + 3] > 127 ? 1 : 0
    inside[i] = on
    outside[i] = on ? 0 : 1
  }
  const dOut = edt2d(inside, w, h)
  const dIn = edt2d(outside, w, h)
  const signed = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) signed[i] = inside[i] ? Math.sqrt(dIn[i]) : -Math.sqrt(dOut[i])

  const blurred = new Float32Array(w * h)
  const tmp = new Float32Array(w * h)
  const K = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136]
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let k = -2; k <= 2; k++) s += K[k + 2] * signed[y * w + Math.min(w - 1, Math.max(0, x + k))]
      tmp[y * w + x] = s
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let k = -2; k <= 2; k++) s += K[k + 2] * tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x]
      blurred[y * w + x] = s
    }

  const out = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const norm = Math.max(0, Math.min(1, 0.5 + blurred[i] / (2 * SDF_SPREAD)))
    const b = Math.round(norm * 255)
    out[i * 4] = b
    out[i * 4 + 1] = b
    out[i * 4 + 2] = b
    out[i * 4 + 3] = 255
  }
  return out
}

function fallbackAlpha(w: number, h: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4)
  const hx = w / 2 - SDF_PAD
  const hy = h / 2 - SDF_PAD
  const r = Math.min(hx, hy) * 0.45
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - w / 2) - (hx - r)
      const dy = Math.abs(y - h / 2) - (hy - r)
      const qx = Math.max(dx, 0)
      const qy = Math.max(dy, 0)
      const d = Math.hypot(qx, qy) + Math.min(Math.max(dx, dy), 0) - r
      px[(y * w + x) * 4 + 3] = d < 0 ? 255 : 0
    }
  }
  return px
}

export default function GlassIcon(props: GlassIconProps) {
  const {
    style,
    background = "#000000",
    shape = "Torus",
    logo = "",
    depth = 32,
    size = 60,
    speed = 100,
    direction = "Clockwise",
    backdrop = BACKDROP_PROP_DEFAULT,
    glass = GLASS_PROP_DEFAULT,
  } = props

  const tiltXMV = useRef(motionValue(0)).current
  const tiltYMV = useRef(motionValue(0)).current

  const bd: Required<BackdropGroup> = {
    ...DEFAULT_BACKDROP,
    ...(backdrop ?? {}),
    font: { ...DEFAULT_FONT, ...(backdrop?.font ?? {}) },
  }
  const gl3: Required<GlassGroup> = { ...DEFAULT_GLASS, ...(glass ?? {}) }

  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const live = useRef({ background, shape, logo, depth, size, speed, direction, bd, gl3 })
  live.current = { background, shape, logo, depth, size, speed, direction, bd, gl3 }

  const rebuildPlate = useRef(true)
  const rebuildSDF = useRef(true)

  const logoSrc = srcOf(logo)
  useEffect(() => {
    rebuildSDF.current = true
  }, [logoSrc, shape])

  const plateType = bd.type
  const plateImage = srcOf(bd.image)
  const plateVideo = srcOf(bd.video)
  const plateText = bd.text
  const plateTextColor = bd.textColor
  const plateFontKey = [
    bd.font.fontFamily,
    bd.font.fontSize,
    bd.font.fontWeight,
    bd.font.fontStyle,
    bd.font.letterSpacing,
    bd.font.lineHeight,
  ].join("|")

  useEffect(() => {
    rebuildPlate.current = true
  }, [plateType, plateImage, plateVideo, plateText, plateTextColor, plateFontKey, background])

  useEffect(() => {
    const canvasEl = canvasRef.current
    const hostEl = hostRef.current
    if (!canvasEl || !hostEl) return
    const canvas: HTMLCanvasElement = canvasEl
    const host: HTMLDivElement = hostEl

    const opts = { antialias: false, alpha: true, premultipliedAlpha: true }
    const ctx = (canvas.getContext("webgl2", opts) ||
      canvas.getContext("webgl", opts)) as WebGLRenderingContext | null
    if (!ctx) return
    const gl: WebGLRenderingContext = ctx

    const plateProg = link(gl, FULLSCREEN_VS, PLATE_FS)
    const glassProg = link(gl, FULLSCREEN_VS, GLASS_FS)
    if (!plateProg || !glassProg) return

    const uPlatePass = {
      plate: gl.getUniformLocation(plateProg, "uPlate"),
      fit: gl.getUniformLocation(plateProg, "uPlateFit"),
      res: gl.getUniformLocation(plateProg, "uRes"),
    }
    const u = {
      res: gl.getUniformLocation(glassProg, "uRes"),
      aspect: gl.getUniformLocation(glassProg, "uAspect"),
      tanHalf: gl.getUniformLocation(glassProg, "uTanHalf"),
      plate: gl.getUniformLocation(glassProg, "uPlate"),
      plateFit: gl.getUniformLocation(glassProg, "uPlateFit"),
      hasPlate: gl.getUniformLocation(glassProg, "uHasPlate"),
      env: gl.getUniformLocation(glassProg, "uEnv"),
      sdf: gl.getUniformLocation(glassProg, "uSDF"),
      rot: gl.getUniformLocation(glassProg, "uRot"),
      rotT: gl.getUniformLocation(glassProg, "uRotT"),
      center: gl.getUniformLocation(glassProg, "uCenter"),
      scale: gl.getUniformLocation(glassProg, "uScale"),
      boundR: gl.getUniformLocation(glassProg, "uBoundR"),
      shape: gl.getUniformLocation(glassProg, "uShape"),
      halfDepth: gl.getUniformLocation(glassProg, "uHalfDepth"),
      bevel: gl.getUniformLocation(glassProg, "uBevel"),
      torusTube: gl.getUniformLocation(glassProg, "uTorusTube"),
      logoHalf: gl.getUniformLocation(glassProg, "uLogoHalf"),
      sdfUnits: gl.getUniformLocation(glassProg, "uSdfUnits"),
      disp: gl.getUniformLocation(glassProg, "uDisp"),
      frost: gl.getUniformLocation(glassProg, "uFrost"),
      tint: gl.getUniformLocation(glassProg, "uTint"),
    }
    const aPlatePos = gl.getAttribLocation(plateProg, "aPos")
    const aGlassPos = gl.getAttribLocation(glassProg, "aPos")

    const quadBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

    function makeTex(wrap: number) {
      const t = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0])
      )
      return t
    }
    const plateTex = makeTex(gl.CLAMP_TO_EDGE)
    const sdfTex = makeTex(gl.CLAMP_TO_EDGE)
    const envTex = makeTex(gl.REPEAT)

    const envCanvas = buildEnvCanvas()
    if (envCanvas) {
      gl.bindTexture(gl.TEXTURE_2D, envTex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, envCanvas)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    }

    const textCanvas = document.createElement("canvas")
    function renderTextToCanvas(text: string, font: FontValue, color: string, bg: string) {
      textCanvas.width = 1024
      textCanvas.height = 1024
      const tctx = textCanvas.getContext("2d")
      if (!tctx) return
      tctx.fillStyle = bg
      tctx.fillRect(0, 0, 1024, 1024)

      const fontSize = numOf(font.fontSize, 96)
      const family = font.fontFamily || "Inter, sans-serif"
      const weight = font.fontWeight || 700
      tctx.font = `${weight} ${fontSize}px ${family}`
      tctx.fillStyle = color
      tctx.textAlign = "center"
      tctx.textBaseline = "middle"

      const lines = text.split("\n")
      const lineH = fontSize * numOf(font.lineHeight, 1.1)
      const startY = 512 - ((lines.length - 1) * lineH) / 2
      lines.forEach((l, i) => {
        tctx.fillText(l, 512, startY + i * lineH)
      })
    }

    function updatePlateTexture() {
      const state = live.current
      const b = state.bd
      if (b.type === "None") {
        gl.bindTexture(gl.TEXTURE_2D, plateTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))
        rebuildPlate.current = false
        return
      }
      if (b.type === "Text") {
        renderTextToCanvas(b.text || "", b.font || {}, b.textColor || "#FFFFFF", state.background || "#000000")
        gl.bindTexture(gl.TEXTURE_2D, plateTex)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        rebuildPlate.current = false
        return
      }
      if (b.type === "Image" && b.image) {
        const imgEl = new Image()
        imgEl.crossOrigin = "anonymous"
        imgEl.onload = () => {
          gl.bindTexture(gl.TEXTURE_2D, plateTex)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgEl)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        }
        imgEl.src = b.image
        rebuildPlate.current = false
        return
      }
    }

    function updateSDFTexture() {
      const state = live.current
      if (!state.logo) {
        const fallback = fallbackAlpha(256, 256)
        const sdfData = bakeSDF(fallback, 256, 256)
        gl.bindTexture(gl.TEXTURE_2D, sdfTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, sdfData)
        rebuildSDF.current = false
        return
      }
      const limg = new Image()
      limg.crossOrigin = "anonymous"
      limg.onload = () => {
        const scanvas = document.createElement("canvas")
        scanvas.width = 256
        scanvas.height = 256
        const sctx = scanvas.getContext("2d")
        if (!sctx) return
        sctx.drawImage(limg, 0, 0, 256, 256)
        const imgData = sctx.getImageData(0, 0, 256, 256)
        const sdfData = bakeSDF(imgData.data, 256, 256)
        gl.bindTexture(gl.TEXTURE_2D, sdfTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, sdfData)
        rebuildSDF.current = false
      }
      limg.onerror = () => {
        const fallback = fallbackAlpha(256, 256)
        const sdfData = bakeSDF(fallback, 256, 256)
        gl.bindTexture(gl.TEXTURE_2D, sdfTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, sdfData)
        rebuildSDF.current = false
      }
      limg.src = state.logo
    }

    let animId = 0
    let autoYaw = 0
    let autoPitch = 0

    function renderFrame() {
      if (rebuildPlate.current) updatePlateTexture()
      if (rebuildSDF.current) updateSDFTexture()

      const w = canvas.clientWidth || 300
      const h = canvas.clientHeight || 300
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }

      const state = live.current
      const spd = (state.speed ?? 50) / 50
      const dir = state.direction === "Counterclockwise" ? -1 : 1
      const dt = 0.016 * spd * dir

      autoYaw += SPIN_YAW * dt
      autoPitch += SPIN_PITCH * dt

      const curTiltX = tiltXMV.get()
      const curTiltY = tiltYMV.get()

      const totalYaw = autoYaw + curTiltX
      const totalPitch = autoPitch + curTiltY

      const rotMat = rotYX(totalYaw, totalPitch)
      const rotMatT = transpose3(rotMat)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(plateProg)
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
      gl.enableVertexAttribArray(aPlatePos)
      gl.vertexAttribPointer(aPlatePos, 2, gl.FLOAT, false, 0, 0)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, plateTex)
      gl.uniform1i(uPlatePass.plate, 0)
      gl.uniform2f(uPlatePass.fit, 1.0, 1.0)
      gl.uniform2f(uPlatePass.res, w, h)

      gl.drawArrays(gl.TRIANGLES, 0, 3)

      gl.useProgram(glassProg)
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
      gl.enableVertexAttribArray(aGlassPos)
      gl.vertexAttribPointer(aGlassPos, 2, gl.FLOAT, false, 0, 0)

      const aspect = w / h
      const tanHalf = Math.tan(FOV / 2)

      gl.uniform2f(u.res, w, h)
      gl.uniform1f(u.aspect, aspect)
      gl.uniform1f(u.tanHalf, tanHalf)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, plateTex)
      gl.uniform1i(u.plate, 0)
      gl.uniform2f(u.plateFit, 1.0, 1.0)
      gl.uniform1f(u.hasPlate, state.bd.type !== "None" ? 1.0 : 0.0)

      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, envTex)
      gl.uniform1i(u.env, 1)

      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, sdfTex)
      gl.uniform1i(u.sdf, 2)

      gl.uniformMatrix3fv(u.rot, false, rotMat)
      gl.uniformMatrix3fv(u.rotT, false, rotMatT)
      gl.uniform3f(u.center, 0, 0, -CAM_DIST)
      gl.uniform1f(u.scale, (state.size ?? 60) / 50)
      gl.uniform1f(u.boundR, 2.5)

      const shapeIdx = state.shape === "X" ? 0 : state.shape === "Torus" ? 1 : state.shape === "Sphere" ? 2 : 3
      gl.uniform1f(u.shape, shapeIdx)
      gl.uniform1f(u.halfDepth, (state.depth ?? 32) / 100)
      gl.uniform1f(u.bevel, BEVEL)
      gl.uniform1f(u.torusTube, 0.35)
      gl.uniform2f(u.logoHalf, 1.0, 1.0)
      gl.uniform1f(u.sdfUnits, 32 / 128)

      gl.uniform1f(u.disp, (state.gl3.chromatic ?? 50) / 100)
      gl.uniform1f(u.frost, (state.gl3.frost ?? 50) / 100)
      const tintRgb = parseColor(state.gl3.tint, [1, 1, 1])
      gl.uniform3f(u.tint, tintRgb[0], tintRgb[1], tintRgb[2])

      gl.drawArrays(gl.TRIANGLES, 0, 3)

      animId = requestAnimationFrame(renderFrame)
    }

    renderFrame()

    const handlePointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      animate(tiltXMV, nx * TILT_RANGE, TILT_EASING)
      animate(tiltYMV, -ny * TILT_RANGE, TILT_EASING)
    }

    const handlePointerLeave = () => {
      animate(tiltXMV, 0, TILT_EASING)
      animate(tiltYMV, 0, TILT_EASING)
    }

    host.addEventListener("pointermove", handlePointerMove)
    host.addEventListener("pointerleave", handlePointerLeave)

    return () => {
      cancelAnimationFrame(animId)
      host.removeEventListener("pointermove", handlePointerMove)
      host.removeEventListener("pointerleave", handlePointerLeave)
      gl.deleteTexture(plateTex)
      gl.deleteTexture(sdfTex)
      gl.deleteTexture(envTex)
      gl.deleteProgram(plateProg)
      gl.deleteProgram(glassProg)
      gl.deleteBuffer(quadBuf)
    }
  }, [])

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: background,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  )
}
