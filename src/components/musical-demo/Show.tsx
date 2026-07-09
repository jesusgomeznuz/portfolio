// La función: el reloj de la canción manda y todo se deriva de él — posición
// de la bola, fases de sensores, mecha, wavy, explosiones. Espejo del juego en
// un solo acto: aquí no hay timeline binario, la matemática ES la partitura.
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Corridor, type WavePulse } from './Corridor';
import {
  BALL_RADIUS,
  BORDER_HEIGHT,
  CAM_HEIGHT,
  CHARACTER_COLORS,
  activeFuse,
  activeWavy,
  assignDecoyCharacters,
  buildSegments,
  characterImage,
  explosionTimeOf,
  fusePhase,
  fuseScale,
  fuseSegments,
  positionAt,
  segmentIndexAt,
  totalDuration,
  type Corridor as CorridorData,
  type DecoyPoint,
  type Explosion,
  type Fuse,
  type Palette,
  type VoiceSegment,
  type WavyWindow,
} from './song_rules';

const TRAIL_LEN = 34;
const WAVE_MAX_AGE = 2.5;

export interface ShowData {
  corridor: CorridorData;
  voices: VoiceSegment[];
  explosions: Explosion[];
  wavyWindows: WavyWindow[];
  decoys: DecoyPoint[];
}

interface Fx { id: number; x: number; z: number; born: number }
interface BurstFx extends Fx { color: string }

export function Show({
  data,
  palette,
  playing,
  clockRef,
  edgeRef,
  onSingerChange,
  onEnded,
}: {
  data: ShowData;
  palette: Palette;
  playing: boolean;
  clockRef: React.MutableRefObject<number>;
  edgeRef: React.MutableRefObject<HTMLDivElement | null>;
  onSingerChange: (character: string) => void;
  onEnded: () => void;
}) {
  const segments = useMemo(() => buildSegments(data.corridor), [data]);
  const fuses = useMemo(() => fuseSegments(data.explosions, segments), [data, segments]);
  const explosionTimes = useMemo(
    () => data.explosions.map((explosion) => explosionTimeOf(explosion, segments)),
    [data, segments],
  );
  const decoyCast = useMemo(() => assignDecoyCharacters(data.voices, data.decoys), [data]);
  const duration = useMemo(() => totalDuration(segments), [segments]);

  const ball = useRef<THREE.Group>(null);
  const trailHistory = useRef<Array<{ x: number; z: number }>>([]);
  const wavePulses = useRef<WavePulse[]>([]);
  const destroyedDecoys = useRef(new Set<number>());
  const fired = useRef({ swaps: new Set<number>(), explosions: new Set<number>(), ended: false });
  const cameraStarted = useRef(false);
  const previousSegment = useRef(0);

  const [singer, setSinger] = useState(data.voices[0].character);
  const [stateIndex, setStateIndex] = useState(0);
  const [ripples, setRipples] = useState<Fx[]>([]);
  const [voiceBursts, setVoiceBursts] = useState<BurstFx[]>([]);
  const [bombBursts, setBombBursts] = useState<Fx[]>([]);
  const nextFxId = useRef(1);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    if (playing) clockRef.current += dt;
    const t = clockRef.current;

    if (t >= duration + 1.0 && !fired.current.ended) {
      fired.current.ended = true;
      onEnded();
    }

    // ── la bola ──
    const position = positionAt(segments, t);
    const ballY = -BORDER_HEIGHT + 0.001;
    if (ball.current) {
      ball.current.position.set(position.x, ballY, position.z);
      const fuse = activeFuse(fuses, t);
      const scale = fuse ? fuseScale(fuse, t) : [1, 1, 1];
      ball.current.scale.set(scale[0], scale[1], scale[2]);
    }

    // ── estela ──
    if (playing) {
      trailHistory.current.push({ x: position.x, z: position.z });
      while (trailHistory.current.length > TRAIL_LEN) trailHistory.current.shift();
    }

    // ── rebotes: onda wavy o ripple ──
    const segmentIndex = segmentIndexAt(segments, t);
    if (segmentIndex !== previousSegment.current) {
      for (let crossed = previousSegment.current; crossed < segmentIndex; crossed++) {
        const center = segments[crossed].to;
        if (activeWavy(data.wavyWindows, fuses, t)) {
          const wall = data.corridor.path[crossed + 1] ?? center;
          wavePulses.current.push({ x: wall.x, z: wall.z, age: 0 });
        } else {
          setRipples((current) => [
            ...current.filter((fx) => t - fx.born < 0.6),
            { id: nextFxId.current++, x: center.x, z: center.z, born: t },
          ]);
        }
      }
      previousSegment.current = segmentIndex;
    }
    for (const pulse of wavePulses.current) pulse.age += playing ? dt : 0;
    wavePulses.current = wavePulses.current.filter((pulse) => pulse.age < WAVE_MAX_AGE);

    // ── cambios de voz ──
    data.voices.forEach((segment, index) => {
      if (index === 0 || segment.start > t || fired.current.swaps.has(index)) return;
      fired.current.swaps.add(index);
      setSinger(segment.character);
      onSingerChange(segment.character);
      setVoiceBursts((current) => [
        ...current.filter((fx) => t - fx.born < 0.8),
        {
          id: nextFxId.current++,
          x: position.x,
          z: position.z,
          born: t,
          color: CHARACTER_COLORS[segment.character] ?? '#ffffff',
        },
      ]);
    });

    // ── los bursts destruyen señuelos ──
    for (const burst of voiceBursts) {
      const age = t - burst.born;
      if (age < 0 || age > 0.65) continue;
      const radius = BALL_RADIUS + (age / 0.55) * BALL_RADIUS * 9;
      decoyCast.forEach(({ decoy }, index) => {
        if (destroyedDecoys.current.has(index)) return;
        const distance = Math.hypot(decoy.x - burst.x, decoy.z - burst.z);
        if (distance <= radius) destroyedDecoys.current.add(index);
      });
    }

    // ── explosiones de pared ──
    explosionTimes.forEach((explosionTime, index) => {
      if (explosionTime > t || fired.current.explosions.has(index)) return;
      fired.current.explosions.add(index);
      setStateIndex(index + 1);
      setBombBursts((current) => [
        ...current.filter((fx) => t - fx.born < 1.0),
        { id: nextFxId.current++, x: position.x, z: position.z, born: t },
      ]);
    });

    // ── la cámara cenital sigue a la bola ──
    const camera = state.camera;
    const target = new THREE.Vector3(position.x, ballY + CAM_HEIGHT, position.z);
    if (!cameraStarted.current) {
      cameraStarted.current = true;
      camera.up.set(0, 0, -1);
      camera.position.copy(target);
    } else {
      const alpha = 1 - Math.exp(-10 * dt);
      camera.position.lerp(target, alpha);
    }
    camera.lookAt(camera.position.x, ballY, camera.position.z);

    // ── viñeta de borde (DOM) ──
    if (edgeRef.current) {
      const fuse = activeFuse(fuses, t);
      const wavy = activeWavy(data.wavyWindows, fuses, t);
      if (fuse) {
        const window = Math.max(fuse.end - fuse.start, 0.01);
        const progress = Math.min(Math.max(1 - (fuse.end - t) / window, 0), 1);
        const period = 1.0 + (0.3 - 1.0) * progress;
        const pulse = Math.pow(Math.sin((t / period) * Math.PI * 2) * 0.5 + 0.5, 0.6);
        edgeRef.current.style.boxShadow = `inset 0 0 60px 18px rgba(255, 45, 70, ${(pulse * 0.6 * Math.sqrt(progress)).toFixed(3)})`;
      } else if (wavy) {
        const pulse = Math.pow(Math.sin(t * Math.PI * 2) * 0.5 + 0.5, 0.6);
        edgeRef.current.style.boxShadow = `inset 0 0 60px 18px rgba(59, 200, 255, ${(pulse * 0.36).toFixed(3)})`;
      } else {
        edgeRef.current.style.boxShadow = 'none';
      }
    }
  });

  return (
    <>
      <Corridor
        corridor={data.corridor}
        explosions={data.explosions}
        palette={palette}
        stateIndex={stateIndex}
        wavePulses={wavePulses}
      />

      <group ref={ball}>
        <Ball character={singer} clockRef={clockRef} fuses={fuses} />
      </group>
      <FuseArc clockRef={clockRef} fuses={fuses} wavyWindows={data.wavyWindows} segments={segments} />
      <Trail history={trailHistory} singer={singer} />

      {data.voices.slice(1).map((segment, index) => {
        const at = positionAt(segments, segment.start);
        return (
          <Cookie
            key={`real-${index}`}
            character={segment.character}
            swapTs={segment.start}
            decoy={false}
            destroyed={false}
            x={at.x}
            z={at.z}
            clockRef={clockRef}
          />
        );
      })}
      {decoyCast.map(({ decoy, character }, index) => (
        <Cookie
          key={`decoy-${index}`}
          character={character}
          swapTs={decoy.swapTs}
          decoy
          destroyed={destroyedDecoys.current.has(index)}
          x={decoy.x}
          z={decoy.z}
          clockRef={clockRef}
        />
      ))}
      {data.explosions.map((explosion, index) => (
        <SensorMark
          key={`bomb-${index}`}
          image={characterImage('bomb')}
          ringColor="#ff8c0d"
          sensorTime={explosion.sensorTime}
          x={explosion.sensorPos.x}
          z={explosion.sensorPos.z}
          clockRef={clockRef}
        />
      ))}
      {data.wavyWindows.map((window, index) => (
        <SensorMark
          key={`wavy-${index}`}
          image={characterImage('wave')}
          ringColor="#00bfff"
          sensorTime={window.sensorTime}
          x={window.sensorPos.x}
          z={window.sensorPos.z}
          clockRef={clockRef}
        />
      ))}

      {ripples.map((fx) => (
        <Ripple key={fx.id} fx={fx} singer={singer} clockRef={clockRef} />
      ))}
      {voiceBursts.map((fx) => (
        <VoiceBurstFx key={fx.id} fx={fx} clockRef={clockRef} />
      ))}
      {bombBursts.map((fx) => (
        <BombBurstFx key={fx.id} fx={fx} clockRef={clockRef} />
      ))}
    </>
  );
}

// ── La bola: cuerpo, disco y cara — parpadea en rojo durante la mecha ─────────

function Ball({
  character,
  clockRef,
  fuses,
}: {
  character: string;
  clockRef: React.MutableRefObject<number>;
  fuses: Fuse[];
}) {
  const texture = useTexture(characterImage(character));
  const bodyMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const discMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const spriteMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const halfHeight = BALL_RADIUS * 0.33;

  useFrame(() => {
    const t = clockRef.current;
    const fuse = activeFuse(fuses, t);
    const base = new THREE.Color(CHARACTER_COLORS[character] ?? '#ffffff');
    if (fuse) {
      const blink = Math.abs(Math.sin(fusePhase(fuse, t)));
      const blended = new THREE.Color(
        base.r + (1.0 - base.r) * blink,
        base.g + (0.05 - base.g) * blink,
        base.b + (0.05 - base.b) * blink,
      );
      bodyMaterial.current?.color.copy(blended);
      discMaterial.current?.color.copy(blended);
      spriteMaterial.current?.color.setRGB(1, 1 - 0.8 * blink, 1 - 0.8 * blink);
    } else {
      bodyMaterial.current?.color.copy(base);
      discMaterial.current?.color.copy(base);
      spriteMaterial.current?.color.setRGB(1, 1, 1);
    }
  });

  return (
    <group>
      <mesh>
        <cylinderGeometry args={[BALL_RADIUS, BALL_RADIUS, halfHeight * 2, 32]} />
        <meshStandardMaterial ref={bodyMaterial} roughness={0.3} metalness={0.05} />
      </mesh>
      <mesh position={[0, halfHeight + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BALL_RADIUS, 32]} />
        <meshBasicMaterial ref={discMaterial} />
      </mesh>
      <mesh position={[0, halfHeight + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BALL_RADIUS * 2, BALL_RADIUS * 2]} />
        <meshBasicMaterial ref={spriteMaterial} map={texture} transparent />
      </mesh>
    </group>
  );
}

// ── El arco de cuenta regresiva alrededor de la bola ──────────────────────────

function FuseArc({
  clockRef,
  fuses,
  wavyWindows,
  segments,
}: {
  clockRef: React.MutableRefObject<number>;
  fuses: Fuse[];
  wavyWindows: WavyWindow[];
  segments: ReturnType<typeof buildSegments>;
}) {
  const group = useRef<THREE.Group>(null);
  const arc = useRef<THREE.Mesh>(null);
  const spark = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = clockRef.current;
    const fuse = activeFuse(fuses, t);
    const wavy = activeWavy(wavyWindows, fuses, t);
    if (!group.current || !arc.current || !spark.current) return;

    if (!fuse && !wavy) {
      group.current.visible = false;
      return;
    }
    group.current.visible = true;

    const fraction = fuse
      ? Math.min(Math.max((fuse.end - t) / Math.max(fuse.end - fuse.start, 0.01), 0), 1)
      : Math.min(Math.max((wavy!.end - t) / Math.max(wavy!.end - wavy!.start, 0.01), 0), 1);

    const color = fuse
      ? new THREE.Color('#ffb54d').lerp(new THREE.Color('#ff2d46'), 1 - fraction)
      : new THREE.Color('#3bc8ff');
    (arc.current.material as THREE.MeshBasicMaterial).color.copy(color);

    const theta = Math.max(fraction * Math.PI * 2, 0.01);
    arc.current.geometry.dispose();
    arc.current.geometry = new THREE.RingGeometry(BALL_RADIUS * 1.3, BALL_RADIUS * 1.62, 48, 1, 0, theta);

    // la chispa vive en la cabeza del arco
    const head = theta;
    spark.current.position.set(Math.cos(head) * BALL_RADIUS * 1.46, 0, -Math.sin(head) * BALL_RADIUS * 1.46);

    const position = positionAt(segments, t);
    group.current.position.set(position.x, -BORDER_HEIGHT + 0.02, position.z);
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={arc} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[BALL_RADIUS * 1.3, BALL_RADIUS * 1.62, 48]} />
        <meshBasicMaterial transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={spark}>
        <sphereGeometry args={[BALL_RADIUS * 0.14, 8, 8]} />
        <meshBasicMaterial color="#fff6d8" />
      </mesh>
    </group>
  );
}

// ── La estela ─────────────────────────────────────────────────────────────────

function Trail({
  history,
  singer,
}: {
  history: React.MutableRefObject<Array<{ x: number; z: number }>>;
  singer: string;
}) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const trail = history.current;
    const color = new THREE.Color(CHARACTER_COLORS[singer] ?? '#ffffff');
    for (let i = 0; i < TRAIL_LEN - 1; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      if (i + 1 >= trail.length) {
        mesh.visible = false;
        continue;
      }
      const p0 = trail[i];
      const p1 = trail[i + 1];
      const length = Math.hypot(p1.x - p0.x, p1.z - p0.z);
      if (length < 0.0001) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const t = (i + 1) / TRAIL_LEN;
      const width = BALL_RADIUS * 2 * t * 0.85;
      mesh.position.set((p0.x + p1.x) / 2, -BORDER_HEIGHT + 0.005, (p0.z + p1.z) / 2);
      mesh.rotation.set(-Math.PI / 2, 0, -Math.atan2(p1.x - p0.x, p1.z - p0.z));
      mesh.scale.set(width, length, 1);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(color);
      material.opacity = t * 0.5;
    }
  });

  return (
    <>
      {Array.from({ length: TRAIL_LEN - 1 }, (_, i) => (
        <mesh
          key={i}
          ref={(instance) => {
            meshes.current[i] = instance;
          }}
          visible={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// ── Galletas: sensores de swap reales y señuelos (sensors/cookies.rs) ─────────

const COOKIE_SCALE = 0.6;
const APPEAR_WINDOW = 5.0;
const REVEAL_DURATION = 0.45;
const BREATHE_AMP = 0.05;
const BREATHE_FREQ = 2.5;
const SPIN_INTERVAL = 3.5;
const SPIN_DURATION = 0.55;
const SPIN_FLIPS = 2.0;
const DESTROY_DURATION = 0.45;

function elasticOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (Math.PI * 2) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function Cookie({
  character,
  swapTs,
  decoy,
  destroyed,
  x,
  z,
  clockRef,
}: {
  character: string;
  swapTs: number;
  decoy: boolean;
  destroyed: boolean;
  x: number;
  z: number;
  clockRef: React.MutableRefObject<number>;
}) {
  const texture = useTexture(characterImage(character));
  const group = useRef<THREE.Group>(null);
  const faceMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const borderMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const local = useRef({ revealStart: -1, destroyedAt: -1 });
  const radius = BALL_RADIUS * COOKIE_SCALE;

  useFrame(() => {
    const t = clockRef.current;
    if (!group.current) return;
    const timeLeft = swapTs - t;

    if (destroyed && local.current.destroyedAt < 0) local.current.destroyedAt = t;
    const dying = local.current.destroyedAt >= 0 ? (t - local.current.destroyedAt) / DESTROY_DURATION : -1;

    const alpha = dying >= 0 ? Math.max(0.85 * (1 - dying), 0)
      : decoy ? 0.85
      : timeLeft <= 0 ? 0
      : timeLeft < 1.5 ? 0.95
      : timeLeft < APPEAR_WINDOW ? 0.7
      : 0;
    if (faceMaterial.current) faceMaterial.current.opacity = alpha;
    if (borderMaterial.current) borderMaterial.current.opacity = alpha;

    if (dying >= 0) {
      const p = Math.min(dying, 1);
      const pop = 1 + 0.35 * Math.sin(p * Math.PI);
      const shrink = 1 - p * p;
      group.current.scale.setScalar(Math.max(pop * shrink, 0));
      group.current.rotation.y = p * DESTROY_DURATION * 14;
      return;
    }

    // Reveal: reales al entrar su ventana; decoys visibles desde el inicio.
    const shouldShow = decoy || (timeLeft < APPEAR_WINDOW && timeLeft > 0);
    if (shouldShow && local.current.revealStart < 0) local.current.revealStart = decoy ? t - 1 : t;
    if (!shouldShow && !decoy) {
      group.current.scale.setScalar(0);
      return;
    }
    const sinceReveal = t - local.current.revealStart;
    if (sinceReveal < REVEAL_DURATION) {
      group.current.scale.setScalar(elasticOut(sinceReveal / REVEAL_DURATION));
      return;
    }

    // Idle con respiración y giro periódico (offset por swapTs para desfasar decoys)
    const idle = sinceReveal + (decoy ? swapTs % SPIN_INTERVAL : 0);
    const breathe = 1 + BREATHE_AMP * Math.sin(idle * BREATHE_FREQ);
    const sinceSpin = idle % SPIN_INTERVAL;
    if (sinceSpin < SPIN_DURATION) {
      const squash = Math.abs(Math.cos((sinceSpin / SPIN_DURATION) * SPIN_FLIPS * Math.PI));
      group.current.scale.set(squash * breathe, breathe, breathe);
    } else {
      group.current.scale.setScalar(breathe);
    }
  });

  const borderColor = CHARACTER_COLORS[character] ?? '#046d87';

  return (
    <group ref={group} position={[x, 0, z]} scale={0}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 1.18, 32]} />
        <meshBasicMaterial ref={borderMaterial} color={borderColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial ref={faceMaterial} map={texture} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Sensores de bomba y wavy — misma coreografía, icono y anillo propios ──────

function SensorMark({
  image,
  ringColor,
  sensorTime,
  x,
  z,
  clockRef,
}: {
  image: string;
  ringColor: string;
  sensorTime: number;
  x: number;
  z: number;
  clockRef: React.MutableRefObject<number>;
}) {
  const texture = useTexture(image);
  const group = useRef<THREE.Group>(null);
  const faceMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const local = useRef({ revealStart: -1, pickupAt: -1 });
  const radius = BALL_RADIUS * COOKIE_SCALE;

  useFrame(() => {
    const t = clockRef.current;
    if (!group.current) return;
    const timeTo = sensorTime - t;

    if (timeTo <= 0 && local.current.pickupAt < 0) local.current.pickupAt = t;
    const fading = local.current.pickupAt >= 0 ? (t - local.current.pickupAt) * 3 : -1;

    const alpha = fading >= 0 ? Math.max((1 - fading) * 0.85, 0)
      : timeTo < 6.0 && timeTo > 0 && local.current.revealStart >= 0 ? 0.85
      : 0;
    if (faceMaterial.current) faceMaterial.current.opacity = alpha;
    if (ringMaterial.current) ringMaterial.current.opacity = alpha;

    if (fading >= 0) {
      group.current.scale.setScalar(Math.max(1 - fading, 0));
      return;
    }
    if (timeTo < 6.0 && timeTo > 0) {
      if (local.current.revealStart < 0) local.current.revealStart = t;
      const sinceReveal = t - local.current.revealStart;
      if (sinceReveal < REVEAL_DURATION) {
        group.current.scale.setScalar(elasticOut(sinceReveal / REVEAL_DURATION));
      } else {
        group.current.scale.setScalar(1 + 0.06 * Math.sin(sinceReveal * 2.2));
      }
    } else {
      group.current.scale.setScalar(0);
    }
  });

  return (
    <group ref={group} position={[x, 0, z]} scale={0}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 1.2, 32]} />
        <meshBasicMaterial ref={ringMaterial} color={ringColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial ref={faceMaterial} map={texture} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Utilería efímera: ripple de rebote, burst de voz, explosión de bomba ──────

function Ripple({
  fx,
  singer,
  clockRef,
}: {
  fx: Fx;
  singer: string;
  clockRef: React.MutableRefObject<number>;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = (clockRef.current - fx.born) / 0.5;
    if (!mesh.current) return;
    if (t < 0 || t >= 1) {
      mesh.current.visible = false;
      return;
    }
    mesh.current.visible = true;
    const radius = BALL_RADIUS * 0.05 + t * BALL_RADIUS * 2.9;
    mesh.current.scale.set(radius, radius, 1);
    (mesh.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.7;
  });
  return (
    <mesh ref={mesh} position={[fx.x, 0.003, fx.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.88, 1, 32]} />
      <meshBasicMaterial color={CHARACTER_COLORS[singer] ?? '#ffffff'} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function VoiceBurstFx({ fx, clockRef }: { fx: BurstFx; clockRef: React.MutableRefObject<number> }) {
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const nucleus = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const age = clockRef.current - fx.born;
    const animateRing = (mesh: THREE.Mesh | null, delay: number, maxAge: number, baseAlpha: number) => {
      if (!mesh) return;
      const t = (age - delay) / maxAge;
      if (t < 0 || t >= 1) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const radius = BALL_RADIUS + t * BALL_RADIUS * 9;
      mesh.scale.set(radius, radius, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (1 - t * 0.5) * baseAlpha;
    };
    animateRing(ringA.current, 0, 0.55, 0.85);
    animateRing(ringB.current, 0.1, 0.65, 0.5);
    if (nucleus.current) {
      const t = age / 0.22;
      nucleus.current.visible = t >= 0 && t < 1;
      if (nucleus.current.visible) {
        (nucleus.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (1 - t) * 0.9;
      }
    }
  });

  const y = -BORDER_HEIGHT + 0.004;
  return (
    <group position={[fx.x, y, fx.z]}>
      {[ringA, ringB].map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.82, 1, 32]} />
          <meshBasicMaterial color={fx.color} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={nucleus} position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={BALL_RADIUS * 1.2} visible={false}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color={fx.color} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

const BOMB_COLORS = ['#ffd27f', '#ff9d5c', '#fff1c2'];

function BombBurstFx({ fx, clockRef }: { fx: Fx; clockRef: React.MutableRefObject<number> }) {
  const particles = useRef<(THREE.Mesh | null)[]>([]);
  const shockwave = useRef<THREE.Mesh>(null);
  const smoke = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const age = clockRef.current - fx.born;

    if (shockwave.current) {
      const t = age / 0.3;
      shockwave.current.visible = t >= 0 && t < 1;
      if (shockwave.current.visible) {
        shockwave.current.scale.setScalar(0.04 + t * 0.55);
        (shockwave.current.material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - t, 2) * 0.9;
      }
    }
    if (smoke.current) {
      const t = age / 0.28;
      smoke.current.visible = t >= 0 && t < 1;
      if (smoke.current.visible) {
        smoke.current.scale.setScalar(0.02 + t * 0.35);
        (smoke.current.material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - t, 2) * 0.7;
      }
    }
    particles.current.forEach((particle, i) => {
      if (!particle) return;
      const maxAge = 0.6 + ((i * 0.021) % 0.3);
      const t = age / maxAge;
      particle.visible = t >= 0 && t < 1;
      if (!particle.visible) return;
      const angle = (i / 16) * Math.PI * 2 + i * 0.31;
      const speed = 1.8 * (0.55 + ((i * 0.11) % 0.7));
      const drop = 1.2 * age * age * 0.5;
      particle.position.set(
        Math.cos(angle) * speed * age,
        0.002 - drop * 0.02,
        Math.sin(angle) * speed * age,
      );
      (particle.material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - t, 2);
    });
  });

  const y = -BORDER_HEIGHT + 0.005;
  return (
    <group position={[fx.x, y, fx.z]}>
      <mesh ref={shockwave} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.85, 1, 32]} />
        <meshBasicMaterial color="#ffffff" transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={smoke} position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#ffd27f" transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh
          key={i}
          ref={(instance) => {
            particles.current[i] = instance;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <circleGeometry args={[0.01 + ((i * 0.002) % 0.018), 12]} />
          <meshBasicMaterial color={BOMB_COLORS[i % 3]} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
