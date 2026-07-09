// El corredor: exterior con shader de ondas (port GLSL de wave_material.wgsl),
// piso interior con gradiente y borde con caída — espejo de world/corridor.rs.
// Los estados post-explosión se precomputan y stateIndex los aplica.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BORDER_HEIGHT,
  chaikin,
  sampleStops,
  type Corridor as CorridorData,
  type Explosion,
  type Palette,
  type Vec2,
} from './song_rules';

export interface WavePulse { x: number; z: number; age: number }

const MAX_PULSES = 16;

const WAVE_VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Port 1:1 de wave_material.wgsl — anillos tipo gota de agua por pixel.
const WAVE_FRAGMENT = /* glsl */ `
  const float WAVE_SPEED = 0.80;
  const float WAVE_SIGMA = 0.65;
  const float WAVE_K = 26.0;
  const float WAVE_DECAY = 0.8;
  const float WAVE_AMP = 0.042;
  const float R_MAX = 2.0;
  const float COLOR_SCALE = 0.30;

  uniform vec4 pulses[${MAX_PULSES}]; // x, z, age, _
  uniform int count;
  uniform float zMin;
  uniform float zRange;
  uniform vec3 colTop;
  uniform vec3 colBot;
  varying vec3 vWorldPos;

  float waveAt(float dist, float age) {
    if (dist > R_MAX) return 0.0;
    float front = dist - WAVE_SPEED * age;
    if (front > 0.0) return 0.0;
    float envelope = exp(-(front * front) / (2.0 * WAVE_SIGMA * WAVE_SIGMA));
    float osc = cos(WAVE_K * front);
    float decay = exp(-WAVE_DECAY * age);
    return WAVE_AMP * envelope * osc * decay;
  }

  void main() {
    vec2 posXZ = vWorldPos.xz;
    float t = clamp((vWorldPos.z - zMin) / max(zRange, 0.001), 0.0, 1.0);
    vec3 col = mix(colTop, colBot, t);

    float total = 0.0;
    for (int i = 0; i < ${MAX_PULSES}; i++) {
      if (i >= count) break;
      float d = distance(posXZ, pulses[i].xy);
      total += waveAt(d, pulses[i].z);
    }
    total = clamp(total, -WAVE_AMP, WAVE_AMP);

    float b = clamp(1.0 + total / WAVE_AMP * COLOR_SCALE, 0.1, 2.5);
    gl_FragColor = vec4(col * b, 1.0);
  }
`;

function shapeFrom(points: Vec2[]): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.z) : shape.lineTo(p.x, p.z)));
  shape.closePath();
  return shape;
}

function flatGeometry(shape: THREE.Shape): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2); // shape (x, y=z) → mundo (x, 0, z)
  return geometry;
}

interface MeshState {
  ext: THREE.BufferGeometry;
  fill: THREE.BufferGeometry;
  border: THREE.BufferGeometry;
}

function buildMeshState(contour: Vec2[], canvas: Vec2[]): MeshState {
  const smoothWalls = chaikin(contour, 5);
  const smoothFill = chaikin(contour, 3);

  // Exterior: rectángulo con margen y el corredor como agujero.
  const margin = 8;
  const xs = canvas.map((p) => p.x);
  const zs = canvas.map((p) => p.z);
  const rect = shapeFrom([
    { x: Math.min(...xs) - margin, z: Math.min(...zs) - margin },
    { x: Math.max(...xs) + margin, z: Math.min(...zs) - margin },
    { x: Math.max(...xs) + margin, z: Math.max(...zs) + margin },
    { x: Math.min(...xs) - margin, z: Math.max(...zs) + margin },
  ]);
  const hole = new THREE.Path();
  smoothWalls.forEach((p, i) => (i === 0 ? hole.moveTo(p.x, p.z) : hole.lineTo(p.x, p.z)));
  hole.closePath();
  rect.holes.push(hole);
  const ext = flatGeometry(rect);

  // Piso interior: UV.y = avance en Z para el gradiente.
  const fill = flatGeometry(shapeFrom(smoothFill));
  const zmin = Math.min(...contour.map((p) => p.z));
  const zmax = Math.max(...contour.map((p) => p.z));
  const span = Math.max(zmax - zmin, 0.001);
  const positions = fill.getAttribute('position');
  const uvs = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uvs[i * 2] = 0;
    uvs[i * 2 + 1] = (positions.getZ(i) - zmin) / span;
  }
  fill.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  // Borde: pared vertical que cae BORDER_HEIGHT.
  const n = smoothWalls.length;
  const borderPositions = new Float32Array(n * 4 * 3);
  const borderIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = smoothWalls[i];
    const b = smoothWalls[(i + 1) % n];
    const base = i * 4;
    borderPositions.set([a.x, 0, a.z, b.x, 0, b.z, b.x, -BORDER_HEIGHT, b.z, a.x, -BORDER_HEIGHT, a.z], base * 3);
    borderIndices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const border = new THREE.BufferGeometry();
  border.setAttribute('position', new THREE.BufferAttribute(borderPositions, 3));
  border.setIndex(borderIndices);

  return { ext, fill, border };
}

function gradientTexture(palette: Palette): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = sampleStops(palette.intStops, i / 255);
    context.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
    context.fillRect(0, 255 - i, 1, 1); // uv.y=0 abajo del canvas
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Corridor({
  corridor,
  explosions,
  palette,
  stateIndex,
  wavePulses,
}: {
  corridor: CorridorData;
  explosions: Explosion[];
  palette: Palette;
  stateIndex: number;
  wavePulses: React.MutableRefObject<WavePulse[]>;
}) {
  const states = useMemo(() => {
    const contours = [corridor.contour, ...explosions.map((e) => e.contour)];
    return contours.map((contour) => buildMeshState(contour, corridor.canvas));
  }, [corridor, explosions]);

  const zmin = useMemo(() => Math.min(...corridor.contour.map((p) => p.z)), [corridor]);
  const zmax = useMemo(() => Math.max(...corridor.contour.map((p) => p.z)), [corridor]);

  const waveMaterial = useMemo(() => {
    const [r0, g0, b0] = sampleStops(palette.extStops, 0);
    const [r1, g1, b1] = sampleStops(palette.extStops, 1);
    return new THREE.ShaderMaterial({
      vertexShader: WAVE_VERTEX,
      fragmentShader: WAVE_FRAGMENT,
      side: THREE.DoubleSide,
      uniforms: {
        pulses: { value: Array.from({ length: MAX_PULSES }, () => new THREE.Vector4()) },
        count: { value: 0 },
        zMin: { value: zmin },
        zRange: { value: Math.max(zmax - zmin, 0.001) },
        // Sin conversión a lineal: un ShaderMaterial custom escribe directo al
        // framebuffer — los stops sRGB del handoff deben llegar tal cual.
        colTop: { value: new THREE.Color(r0 / 255, g0 / 255, b0 / 255) },
        colBot: { value: new THREE.Color(r1 / 255, g1 / 255, b1 / 255) },
      },
    });
  }, [palette, zmin, zmax]);

  const fillTexture = useMemo(() => gradientTexture(palette), [palette]);

  useFrame(() => {
    const pulses = wavePulses.current;
    const uniformPulses = waveMaterial.uniforms.pulses.value as THREE.Vector4[];
    const count = Math.min(pulses.length, MAX_PULSES);
    for (let i = 0; i < MAX_PULSES; i++) {
      if (i < count) uniformPulses[i].set(pulses[i].x, pulses[i].z, pulses[i].age, 0);
      else uniformPulses[i].set(0, 0, 0, 0);
    }
    waveMaterial.uniforms.count.value = count;
  });

  const state = states[Math.min(stateIndex, states.length - 1)];

  return (
    <group>
      <mesh geometry={state.ext} material={waveMaterial} />
      <mesh geometry={state.fill} position={[0, -BORDER_HEIGHT, 0]}>
        <meshBasicMaterial map={fillTexture} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={state.border}>
        <meshBasicMaterial color={palette.stroke} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
