// El espejo TypeScript de la lógica pura de canicasbrawl-rapier:
// el director (pick_module / module_height), el constructor (resolveModule
// sobre los MISMOS JSON que produce Figma) y la ruleta de pickups.
// Fuente de verdad: src/game/world/{level_generation,modules,pickups}.rs

export const UNIT = 0.35;
export const HALF_DEPTH = UNIT / 4;
export const MARBLE_RADIUS = 0.085;
export const CAMERA_Z = 2.5;
export const CAMERA_FOV_DEG = 45;
export const DESIGN_ASPECT = 9 / 16;
export const GRAVITY_Y = -3.0;
export const RACE_SECS = 35;
export const WALL_HALF_WIDTH = 0.55;
export const FIRST_MODULE_TOP = -0.6;
export const WALLS_TOP = 2.0;

export interface RawObject {
  kind: 'Box' | 'Sphere' | 'Mesh' | 'Image' | 'Effect' | 'EffectSlot';
  x: number;
  y: number;
  hx?: number;
  hy?: number;
  w?: number;
  h?: number;
  rot?: number;
  radius?: number;
  angvel?: [number, number, number];
  border_radius?: number;
  friction?: number;
  restitution?: number;
  bouncy?: boolean;
  model_name?: string;
  texture?: string;
  variant?: string;
  options?: string[];
}

export interface ModuleJson {
  objects: RawObject[];
}

export type PickupVariant = 'freeze' | 'shrink' | 'swap';

export interface ResolvedBox {
  x: number; y: number; hx: number; hy: number; rot: number;
  angvel: [number, number, number];
  friction: number; restitution: number; bouncy: boolean;
  borderRadius: number;
}
export interface ResolvedSphere {
  x: number; y: number; radius: number;
  friction: number; restitution: number; bouncy: boolean;
}
export interface ResolvedTorus {
  x: number; y: number; rot: number;
  majorRadius: number; minorRadius: number;
  angvel: [number, number, number];
  friction: number; restitution: number;
}
export interface ResolvedImage { x: number; y: number; w: number; h: number; rot: number; texture: string }
export interface ResolvedPickup { id: string; x: number; y: number; w: number; h: number; rot: number; variant: PickupVariant }

export interface ResolvedModule {
  boxes: ResolvedBox[];
  spheres: ResolvedSphere[];
  tori: ResolvedTorus[];
  images: ResolvedImage[];
  pickups: ResolvedPickup[];
  bottom: number;
}

// mulberry32 — determinista por seed, suficiente para un demo
export function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof makeRng>;

// El pool con los mismos pesos de pick_module
export const MODULE_POOL: Array<[string, number]> = [
  ['crosses', 5],
  ['zigzag', 5],
  ['spheres', 5],
  ['diamonds', 2],
  ['mini_zigzag', 3],
  ['more_stones', 2],
  ['hex_stones', 3],
  ['toruses', 5],
  ['bouncy_walls', 5],
];

export const MODULE_NAMES = MODULE_POOL.map(([name]) => name);

export function pickModule(rng: Rng, lastModule: string | null, isFirstModule: boolean): string {
  const weighted: string[] = [];
  for (const [name, weight] of MODULE_POOL) {
    for (let i = 0; i < weight; i++) weighted.push(name);
  }
  for (;;) {
    const pick = weighted[Math.floor(rng() * weighted.length)];
    const repeatsLast = pick === lastModule;
    const spheresAsFirst = isFirstModule && pick === 'spheres';
    if (!repeatsLast && !spheresAsFirst) return pick;
  }
}

export function torusRadiiFromName(modelName: string): { majorRadius: number; minorRadius: number } {
  const match = modelName.match(/^torus_R(\d+)_r(\d+)$/);
  if (!match) throw new Error(`model_name ilegible: '${modelName}'`);
  return { majorRadius: Number(match[1]) / 1000, minorRadius: Number(match[2]) / 1000 };
}

function yBounds(object: RawObject): [number, number] {
  const rot = object.rot ?? 0;
  switch (object.kind) {
    case 'Box': {
      const extent = Math.abs(object.hx! * Math.sin(rot)) + Math.abs(object.hy! * Math.cos(rot));
      return [object.y - extent, object.y + extent];
    }
    case 'Sphere':
      return [object.y - object.radius!, object.y + object.radius!];
    case 'Mesh': {
      const { majorRadius, minorRadius } = torusRadiiFromName(object.model_name!);
      const outer = majorRadius + minorRadius;
      return [object.y - outer, object.y + outer];
    }
    default: {
      const extent =
        Math.abs((object.w! / 2) * Math.sin(rot)) + Math.abs((object.h! / 2) * Math.cos(rot));
      return [object.y - extent, object.y + extent];
    }
  }
}

const MODULE_GAP = 0.1;

export function moduleHeight(data: ModuleJson): number {
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const object of data.objects) {
    const [lo, hi] = yBounds(object);
    yMin = Math.min(yMin, lo);
    yMax = Math.max(yMax, hi);
  }
  return yMax - yMin + MODULE_GAP;
}

// La ruleta de pickups.rs: 40% de slots vacíos; freeze 4× / swap 3× / shrink 1×;
// swap prohibido cerca del arranque (world_y > -3).
function shouldSkipEffect(variant: string, worldY: number): boolean {
  return variant === 'swap' && worldY > -3.0;
}

function resolveSlotVariant(options: string[], worldY: number, rng: Rng): PickupVariant | null {
  const skipChance = 0.4;
  if (rng() < skipChance) return null;
  const weights: Array<[PickupVariant, number]> = [['freeze', 4], ['swap', 3], ['shrink', 1]];
  const candidates =
    options.length === 0
      ? weights.flatMap(([name, weight]) => Array(weight).fill(name) as PickupVariant[])
      : (options as PickupVariant[]);
  const valid = candidates.filter((variant) => !shouldSkipEffect(variant, worldY));
  if (valid.length === 0) return null;
  return valid[Math.floor(rng() * valid.length)];
}

// El espejo de spawn_module: resuelve el módulo completo a datos listos para
// renderizar — posiciones absolutas, variantes de slot decididas por seed.
export function resolveModule(
  name: string,
  data: ModuleJson,
  levelTop: number,
  moduleSeed: number,
): ResolvedModule {
  const rng = makeRng(moduleSeed);
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const object of data.objects) {
    const [lo, hi] = yBounds(object);
    yMin = Math.min(yMin, lo);
    yMax = Math.max(yMax, hi);
  }
  const yOffset = levelTop - yMax;

  const resolved: ResolvedModule = {
    boxes: [], spheres: [], tori: [], images: [], pickups: [],
    bottom: levelTop - (yMax - yMin) - MODULE_GAP,
  };

  data.objects.forEach((object, index) => {
    const y = object.y + yOffset;
    switch (object.kind) {
      case 'Box':
        resolved.boxes.push({
          x: object.x, y, hx: object.hx!, hy: object.hy!, rot: object.rot ?? 0,
          angvel: object.angvel ?? [0, 0, 0],
          friction: object.friction ?? 0.15,
          restitution: object.restitution ?? 0.05,
          bouncy: object.bouncy ?? false,
          borderRadius: object.border_radius ?? 0,
        });
        break;
      case 'Sphere':
        resolved.spheres.push({
          x: object.x, y, radius: object.radius!,
          friction: object.friction ?? 0.15,
          restitution: object.restitution ?? 0.05,
          bouncy: object.bouncy ?? false,
        });
        break;
      case 'Mesh': {
        const radii = torusRadiiFromName(object.model_name!);
        resolved.tori.push({
          x: object.x, y, rot: object.rot ?? 0,
          majorRadius: radii.majorRadius, minorRadius: radii.minorRadius,
          angvel: object.angvel ?? [0, 0, 0],
          friction: object.friction ?? 0.15,
          restitution: object.restitution ?? 0.05,
        });
        break;
      }
      case 'Image':
        resolved.images.push({
          x: object.x, y, w: object.w!, h: object.h!, rot: object.rot ?? 0,
          texture: `/canicas/${object.texture!}`,
        });
        break;
      case 'Effect': {
        if (shouldSkipEffect(object.variant!, y)) break;
        resolved.pickups.push({
          id: `${name}-${moduleSeed}-${index}`,
          x: object.x, y, w: object.w!, h: object.h!, rot: object.rot ?? 0,
          variant: object.variant as PickupVariant,
        });
        break;
      }
      case 'EffectSlot': {
        const variant = resolveSlotVariant(object.options ?? [], y, rng);
        if (!variant) break;
        resolved.pickups.push({
          id: `${name}-${moduleSeed}-${index}`,
          x: object.x, y, w: object.w!, h: object.h!, rot: object.rot ?? 0,
          variant,
        });
        break;
      }
    }
  });

  return resolved;
}

// Las paletas de palette.rs — cielo, nubes y tinte de obstáculos.
export type PaletteName = 'azul' | 'neon' | 'rosa';

export interface Palette {
  skyStops: Array<[number, string]>;
  cloudNear: string;
  cloudMid: string;
  cloudFar: string;
  obstacleTint: [number, number, number];
}

export const PALETTES: Record<PaletteName, Palette> = {
  azul: {
    skyStops: [
      [0.0, '#073B4C'],
      [0.4, '#0E7C92'],
      [0.66, '#13A0AE'],
      [0.84, '#1EB6BE'],
      [1.0, '#1EB6BE'],
    ],
    cloudNear: '#ebf5ff',
    cloudMid: '#99d1e6',
    cloudFar: '#3899b8',
    obstacleTint: [0.027, 0.231, 0.298],
  },
  neon: {
    skyStops: [
      [0.0, '#171540'],
      [0.4, '#46266E'],
      [0.66, '#C0417E'],
      [0.84, '#FF7E6B'],
      [1.0, '#FF7E6B'],
    ],
    cloudNear: '#8f7ac2',
    cloudMid: '#635294',
    cloudFar: '#3b2b66',
    obstacleTint: [0.27, 0.15, 0.43],
  },
  rosa: {
    skyStops: [
      [0.0, '#5C0844'],
      [0.35, '#B82078'],
      [0.62, '#EE55A4'],
      [0.82, '#FF99CC'],
      [1.0, '#FFBBDD'],
    ],
    cloudNear: '#ffffff',
    cloudMid: '#fad1eb',
    cloudFar: '#eda6d4',
    obstacleTint: [0.361, 0.031, 0.267],
  },
};

// palette.rs::obstacle_color() — white_matte (0.92,0.92,0.90) mezclado 50/50 con el tinte.
export function obstacleColorFor(palette: Palette): string {
  const strength = 0.5;
  const white = 1 - strength;
  const [r, g, b] = palette.obstacleTint;
  const channel = (base: number, tint: number) => Math.round((base * white + tint * strength) * 255);
  return `rgb(${channel(0.92, r)}, ${channel(0.92, g)}, ${channel(0.9, b)})`;
}

// El roster default con los colores dominantes calculados con el MISMO
// algoritmo del juego (faces.rs::dominant_color_from_png) sobre los PNG reales.
export interface Character { name: string; color: string; image: string }

export const ROSTER: Character[] = [
  { name: 'Marceline', color: '#507070', image: '/canicas/characters/marceline.png' },
  { name: 'Perla', color: '#f0d0b0', image: '/canicas/characters/perla.png' },
  { name: 'Steven', color: '#f0b0b0', image: '/canicas/characters/steven.png' },
  { name: 'Wendy', color: '#b03010', image: '/canicas/characters/wendy.png' },
  { name: 'Naruto', color: '#505050', image: '/canicas/characters/naruto.png' },
  { name: 'Ben10', color: '#50b050', image: '/canicas/characters/ben10.png' },
  { name: 'Patricio', color: '#f0b0b0', image: '/canicas/characters/patricio.png' },
  { name: 'Finn', color: '#1090d0', image: '/canicas/characters/finn.png' },
  { name: 'Bart', color: '#f0d010', image: '/canicas/characters/bart.png' },
];

export function spawnGrid(): Array<[number, number]> {
  const dx = 0.25;
  const dy = 0.3;
  const grid: Array<[number, number]> = [];
  for (const row of [dy, 0, -dy]) {
    for (const col of [-dx, 0, dx]) grid.push([col, row]);
  }
  return grid;
}

// Encuadre 9:16 fijo — la misma proyección manual que camera.rs usa para
// decidir qué pickups disparan (solo los visibles en pantalla).
export function isOnScreen(worldX: number, worldY: number, cameraY: number): boolean {
  const halfHeight = CAMERA_Z * Math.tan(((CAMERA_FOV_DEG / 2) * Math.PI) / 180);
  const halfWidth = halfHeight * DESIGN_ASPECT;
  return Math.abs(worldX) <= halfWidth && Math.abs(worldY - cameraY) <= halfHeight;
}
