// El espejo TypeScript de la lógica pura de musical-path-rapier:
// los loaders del pick (content/), la trayectoria (process_picks/ball_path.rs),
// la mecha en forma cerrada (sensors/bomb.rs) y el reparto LRU de señuelos
// (process_picks/mod.rs). Sin física: todo es tiempo → posición.

export const BALL_RADIUS = 0.07;
export const BORDER_HEIGHT = 0.1;
export const CAM_HEIGHT = 2.25;
export const CAM_FOV_DEG = 45;

// ── Paletas (background/palette.rs) ───────────────────────────────────────────

export type PaletteName = 'turquesa' | 'rosa' | 'lavanda';

export interface Palette {
  extStops: Array<[number, [number, number, number]]>;
  intStops: Array<[number, [number, number, number]]>;
  stroke: string;
  ball: [number, number, number];
}

export const PALETTES: Record<PaletteName, Palette> = {
  turquesa: {
    extStops: [[0.0, [0x16, 0xa9, 0xc6]], [0.52, [0x0c, 0x93, 0xb0]], [1.0, [0x04, 0x83, 0x9c]]],
    intStops: [[0.0, [0xdf, 0xfc, 0xff]], [0.52, [0xec, 0xfd, 0xff]], [1.0, [0xf4, 0xfe, 0xff]]],
    stroke: '#046d87',
    ball: [0x0b, 0xba, 0xd2],
  },
  rosa: {
    extStops: [[0.0, [0xff, 0x8a, 0xc4]], [0.52, [0xfd, 0x66, 0xa8]], [1.0, [0xf9, 0x4d, 0x97]]],
    intStops: [[0.0, [0xff, 0xe3, 0xff]], [0.52, [0xff, 0xee, 0xfb]], [1.0, [0xff, 0xf5, 0xfc]]],
    stroke: '#dd3f88',
    ball: [0xfb, 0x4f, 0x97],
  },
  lavanda: {
    extStops: [[0.0, [0x5a, 0x4f, 0xe6]], [0.52, [0x7a, 0x5a, 0xf0]], [1.0, [0xff, 0x8a, 0x5c]]],
    intStops: [[0.0, [0xe9, 0xe6, 0xfb]], [0.52, [0xf3, 0xf1, 0xfd]], [1.0, [0xff, 0xf6, 0xee]]],
    stroke: '#3a2db4',
    ball: [0x51, 0x42, 0xe0],
  },
};

export function sampleStops(stops: Array<[number, [number, number, number]]>, t: number): [number, number, number] {
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const f = Math.min(Math.max((t - t0) / (t1 - t0), 0), 1);
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ];
    }
  }
  return stops[stops.length - 1][1];
}

// ── Colores por personaje (characters.rs — dominantes precomputados con el
// algoritmo exacto, + los overrides fijos) ────────────────────────────────────

export const CHARACTER_COLORS: Record<string, string> = {
  Goku: '#f09010',
  bart: '#f0d010',
  ben10: '#50b050',
  dulceprincesa: '#f070d0',
  marceline: '#507070',
  mordecai: '#90b0d0',
  perla: '#90f0d0',
  bomb: '#ff8c0d',
  wave: '#00bfff',
};

export function characterImage(character: string): string {
  return `/musical/characters/${character}.png`;
}

// ── Los JSONs del pick (content/) ─────────────────────────────────────────────

export interface Vec2 { x: number; z: number }

export interface Corridor {
  timestamps: number[];
  /// Puntos de contacto en la pared.
  path: Vec2[];
  /// Centro real de la bola en cada rebote (path − normal·radio).
  pathCenter: Vec2[];
  contour: Vec2[];
  canvas: Vec2[];
}

export function parseCorridor(raw: any): Corridor {
  const nf = raw.meta.norm_factor as number;
  const points = (pts: number[][]) => pts.map(([x, z]) => ({ x: x / nf, z: z / nf }));
  const path = points(raw.path);
  const normals: Vec2[] = raw.bounce_normals
    ? raw.bounce_normals.map(([x, z]: number[]) => ({ x, z }))
    : path.map(() => ({ x: 0, z: 0 }));
  const pathCenter = path.map((p, i) => ({
    x: p.x - normals[i].x * BALL_RADIUS,
    z: p.z - normals[i].z * BALL_RADIUS,
  }));
  return {
    timestamps: raw.timestamps,
    path,
    pathCenter,
    contour: points(raw.contour),
    canvas: points(raw.canvas).slice(0, 4),
  };
}

export interface VoiceSegment { start: number; character: string }

export function parseVoiceTimeline(raw: any): VoiceSegment[] {
  return raw.segments.map((s: any) => ({ start: s.start, character: s.character }));
}

export function characterAt(segments: VoiceSegment[], t: number): string {
  let current = segments[0].character;
  for (const segment of segments) {
    if (t >= segment.start) current = segment.character;
    else break;
  }
  return current;
}

export interface Explosion {
  bounceIdx: number;
  sensorTime: number;
  sensorPos: Vec2;
  contour: Vec2[];
}

export function parseExplosions(raw: any): Explosion[] {
  if (!raw || !raw.events) return [];
  const nf = raw.norm_factor as number;
  return raw.events.map((e: any) => ({
    bounceIdx: e.bounce_idx,
    sensorTime: e.sensor_time ?? 0,
    sensorPos: { x: e.sensor_pos?.[0] ?? 0, z: e.sensor_pos?.[1] ?? 0 },
    contour: e.contour.map(([x, z]: number[]) => ({ x: x / nf, z: z / nf })),
  }));
}

export interface WavyWindow { sensorTime: number; sensorPos: Vec2; start: number; end: number }

export function parseWavySegments(raw: any): WavyWindow[] {
  if (!raw || !raw.segments) return [];
  return raw.segments.map((s: any) => ({
    sensorTime: s.sensor_time,
    sensorPos: { x: s.sensor_pos[0], z: s.sensor_pos[1] },
    start: s.start_time,
    end: s.end_time,
  }));
}

export interface DecoyPoint { x: number; z: number; swapTs: number; exclude: string }

export function parseDecoys(raw: any): DecoyPoint[] {
  if (!raw || !raw.decoys) return [];
  return raw.decoys.map((d: any) => ({
    x: d.x, z: d.z, swapTs: d.swap_ts, exclude: d.exclude_character ?? '',
  }));
}

// ── La trayectoria (ball_path.rs) ─────────────────────────────────────────────

export interface Segment { from: Vec2; to: Vec2; start: number; end: number }

export function buildSegments(corridor: Corridor): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < corridor.pathCenter.length - 1; i++) {
    segments.push({
      from: corridor.pathCenter[i],
      to: corridor.pathCenter[i + 1],
      start: corridor.timestamps[i],
      end: corridor.timestamps[i + 1],
    });
  }
  return segments;
}

export function positionAt(segments: Segment[], t: number): Vec2 {
  for (const segment of segments) {
    if (t <= segment.end) {
      const f = Math.min(Math.max((t - segment.start) / (segment.end - segment.start), 0), 1);
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * f,
        z: segment.from.z + (segment.to.z - segment.from.z) * f,
      };
    }
  }
  const last = segments[segments.length - 1];
  return last ? last.to : { x: 0, z: 0 };
}

export function segmentIndexAt(segments: Segment[], t: number): number {
  const index = segments.findIndex((segment) => t <= segment.end);
  return index === -1 ? segments.length - 1 : index;
}

export function totalDuration(segments: Segment[]): number {
  return segments.length ? segments[segments.length - 1].end : 0;
}

// ── La mecha (sensors/bomb.rs + process_picks/mod.rs) ─────────────────────────

const FUSE_FREQ_START = 1.0;
const FUSE_FREQ_END = 4.0;
const FUSE_PULSE_AMP = 0.14;

export interface Fuse { start: number; end: number; beatFreq: number }

/// timestamps del path: start de cada segmento + el end del último.
function bounceTimes(segments: Segment[]): number[] {
  return segments.map((s) => s.start).concat(segments.length ? [segments[segments.length - 1].end] : []);
}

export function fuseSegments(explosions: Explosion[], segments: Segment[]): Fuse[] {
  const times = bounceTimes(segments);
  const fuses: Fuse[] = [];
  for (const event of explosions) {
    const explosionTime = times[event.bounceIdx + 1] ?? event.sensorTime + 3.0;
    const previousEnd = fuses.length ? fuses[fuses.length - 1].end : -Infinity;
    const start = Math.max(event.sensorTime, previousEnd);
    if (start >= explosionTime) continue;
    const local = segments.find((s) => s.start <= event.sensorTime && s.end > event.sensorTime)
      ?? segments[segments.length - 1];
    const beatFreq = local ? 1 / Math.max(local.end - local.start, 0.05) : 2.0;
    fuses.push({ start, end: explosionTime, beatFreq });
  }
  return fuses;
}

export function explosionTimeOf(explosion: Explosion, segments: Segment[]): number {
  const times = bounceTimes(segments);
  return times[explosion.bounceIdx + 1] ?? explosion.sensorTime + 3.0;
}

export function activeFuse(fuses: Fuse[], t: number): Fuse | null {
  return fuses.find((fuse) => t >= fuse.start && t < fuse.end) ?? null;
}

/// Fase en forma cerrada: la frecuencia interpola 1×→4× del beat — la integral exacta.
export function fusePhase(fuse: Fuse, t: number): number {
  const elapsed = Math.max(t - fuse.start, 0);
  const window = Math.max(fuse.end - fuse.start, 0.01);
  const ramp = fuse.beatFreq * (FUSE_FREQ_END - FUSE_FREQ_START) / (2 * window);
  return Math.PI * 2 * (fuse.beatFreq * FUSE_FREQ_START * elapsed + ramp * elapsed * elapsed);
}

/// Squash & stretch con volumen conservado — [x, y, z].
export function fuseScale(fuse: Fuse, t: number): [number, number, number] {
  const pulse = 1 + FUSE_PULSE_AMP * Math.sin(fusePhase(fuse, t));
  const inverse = 1 / Math.sqrt(pulse);
  return [pulse, inverse, pulse];
}

// ── El modo wavy (sensors/wavy.rs) — la bomba manda ───────────────────────────

export function activeWavy(windows: WavyWindow[], fuses: Fuse[], t: number): WavyWindow | null {
  if (activeFuse(fuses, t)) return null;
  return windows.find((w) => t >= w.start && t < w.end) ?? null;
}

// ── El reparto de señuelos (process_picks::assign_decoy_characters) ───────────

// Los extras del pool son los 2 primeros PNGs (orden byte-wise, como el sort de
// Rust) del roster de assets que no cantan — para el roster actual: Goku y bart.
const DECOY_EXTRAS = ['bomb', 'wave', 'Goku', 'bart'];

export function assignDecoyCharacters(
  voices: VoiceSegment[],
  decoys: DecoyPoint[],
): Array<{ decoy: DecoyPoint; character: string }> {
  const singers: string[] = [];
  for (const segment of voices) {
    if (!singers.includes(segment.character)) singers.push(segment.character);
  }
  const pool = singers.concat(DECOY_EXTRAS.filter((extra) => !singers.includes(extra)));

  const sorted = [...decoys].sort((a, b) => a.swapTs - b.swapTs);
  const lastUsed = new Map<string, number>(pool.map((character) => [character, 0]));

  return sorted.map((decoy, index) => {
    const eligible = pool.filter((character) => character !== decoy.exclude);
    const candidates = eligible.length ? eligible : pool;
    const character = candidates.reduce((best, candidate) =>
      (lastUsed.get(candidate) ?? 0) < (lastUsed.get(best) ?? 0) ? candidate : best,
    );
    lastUsed.set(character, index + 1);
    return { decoy, character };
  });
}

// ── Chaikin (world/corridor.rs) ───────────────────────────────────────────────

export function chaikin(points: Vec2[], iterations: number): Vec2[] {
  let current = points;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const next: Vec2[] = [];
    for (let i = 0; i < current.length; i++) {
      const a = current[i];
      const b = current[(i + 1) % current.length];
      next.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 });
    }
    current = next;
  }
  return current;
}
