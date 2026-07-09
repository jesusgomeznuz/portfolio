// La carrera viva: el director genera el nivel bajo la líder, las canicas
// corren con física real (rapier.js) y los pickups aplican sus efectos.
// Espejo de simulation.rs en modo dev: física en vivo, sin timeline.
import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import {
  CAMERA_Z,
  FIRST_MODULE_TOP,
  HALF_DEPTH,
  MARBLE_RADIUS,
  RACE_SECS,
  ROSTER,
  WALLS_TOP,
  isOnScreen,
  makeRng,
  pickModule,
  resolveModule,
  spawnGrid,
  type Character,
  type ModuleJson,
  type ResolvedModule,
  type ResolvedPickup,
} from './race_rules';
import {
  FROZEN_GROUPS,
  FinishLineVisual,
  FloorBlock,
  MARBLE_GROUPS,
  Module,
  WallSegment,
} from './Module';

useTexture.preload('/canicas/img/finish.png');

interface MarbleFx {
  frozenUntil: number;
  shrunkUntil: number;
  ringUntil: number;
}

interface SpawnedModule {
  key: string;
  name: string;
  top: number;
  resolved: ResolvedModule;
}

const FREEZE_SECS = 2.0;
const SHRINK_SECS = 5.0;
const SHRINK_FACTOR = 0.5;
const RING_SECS = 1.5;

export function Race({
  seed,
  modulesData,
  onFinisher,
}: {
  seed: number;
  modulesData: Record<string, ModuleJson>;
  onFinisher: (name: string) => void;
}) {
  const rng = useMemo(() => makeRng(seed), [seed]);
  const bodies = useRef<(RapierRigidBody | null)[]>(Array(ROSTER.length).fill(null));
  const director = useRef({
    time: 0,
    nextTop: FIRST_MODULE_TOP,
    lastModule: null as string | null,
    modulesSpawned: 0,
    finishSpawned: false,
    cameraStarted: false,
  });
  const cameraY = useRef(-0.1);
  const simTime = useRef(0);
  const fxRef = useRef<MarbleFx[]>(ROSTER.map(() => ({ frozenUntil: 0, shrunkUntil: 0, ringUntil: 0 })));
  const finished = useRef(new Set<number>());
  const consumedRef = useRef(new Set<string>());

  const [modules, setModules] = useState<SpawnedModule[]>([]);
  const [finish, setFinish] = useState<{ finishY: number; floorY: number } | null>(null);
  const [consumed, setConsumed] = useState<Set<string>>(new Set());
  const [fx, setFx] = useState<MarbleFx[]>(fxRef.current.map((f) => ({ ...f })));
  const [leaderIndex, setLeaderIndex] = useState<number | null>(null);

  const bumpFx = () => setFx(fxRef.current.map((f) => ({ ...f })));

  const registerBody = useCallback((index: number) => {
    return (body: RapierRigidBody | null) => {
      bodies.current[index] = body;
    };
  }, []);

  const findSwapPartner = (targetIndex: number, targetY: number): number | null => {
    const others = bodies.current
      .map((body, index) => ({ body, index }))
      .filter(({ body, index }) => body && index !== targetIndex)
      .map(({ body, index }) => ({ index, y: body!.translation().y }));
    const ahead = others.filter((o) => o.y < targetY).sort((a, b) => b.y - a.y)[0];
    if (ahead) return ahead.index;
    const behind = others.filter((o) => o.y > targetY).sort((a, b) => a.y - b.y)[0];
    return behind ? behind.index : null;
  };

  const applyPickup = useCallback(
    (pickup: ResolvedPickup, marbleIndex: number) => {
      if (consumedRef.current.has(pickup.id)) return;
      if (!isOnScreen(pickup.x, pickup.y, cameraY.current)) return;
      const body = bodies.current[marbleIndex];
      if (!body) return;
      const now = simTime.current;
      const marbleFx = fxRef.current[marbleIndex];

      switch (pickup.variant) {
        case 'freeze': {
          if (marbleFx.frozenUntil > now) return;
          body.setBodyType(2, true); // KinematicPositionBased
          body.collider(0)?.setCollisionGroups(FROZEN_GROUPS);
          marbleFx.frozenUntil = now + FREEZE_SECS;
          break;
        }
        case 'shrink': {
          if (marbleFx.shrunkUntil > now) return;
          const collider = body.collider(0);
          collider?.setRadius(MARBLE_RADIUS * SHRINK_FACTOR);
          collider?.setHalfHeight(HALF_DEPTH * SHRINK_FACTOR);
          marbleFx.shrunkUntil = now + SHRINK_SECS;
          break;
        }
        case 'swap': {
          const targetPosition = body.translation();
          const partnerIndex = findSwapPartner(marbleIndex, targetPosition.y);
          if (partnerIndex === null) break;
          const partnerBody = bodies.current[partnerIndex]!;
          const partnerPosition = partnerBody.translation();
          body.setTranslation({ x: partnerPosition.x, y: partnerPosition.y, z: 0 }, true);
          partnerBody.setTranslation({ x: targetPosition.x, y: targetPosition.y, z: 0 }, true);
          marbleFx.ringUntil = now + RING_SECS;
          fxRef.current[partnerIndex].ringUntil = now + RING_SECS;
          break;
        }
      }

      consumedRef.current.add(pickup.id);
      setConsumed(new Set(consumedRef.current));
      bumpFx();
    },
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    simTime.current += dt;
    const now = simTime.current;
    const d = director.current;
    d.time = now;

    // ── el líder: la canica más baja ──
    let leaderY = Infinity;
    let lowestIndex: number | null = null;
    bodies.current.forEach((body, index) => {
      if (!body) return;
      const y = body.translation().y;
      if (y < leaderY) {
        leaderY = y;
        lowestIndex = index;
      }
    });
    if (lowestIndex !== null && lowestIndex !== leaderIndex) setLeaderIndex(lowestIndex);

    // ── el director: generar pista o cerrar con la meta ──
    if (!d.finishSpawned && leaderY !== Infinity) {
      if (now >= RACE_SECS) {
        const finishY = d.nextTop - 0.4;
        setFinish({ finishY, floorY: finishY - 1.0 });
        d.finishSpawned = true;
      } else if (leaderY - d.nextTop < 3.0) {
        const name = pickModule(rng, d.lastModule, d.modulesSpawned === 0);
        const data = modulesData[name];
        if (data) {
          const moduleSeed = Math.floor(rng() * 2 ** 31);
          const resolved = resolveModule(name, data, d.nextTop, moduleSeed);
          const spawned: SpawnedModule = {
            key: `${d.modulesSpawned}-${name}`,
            name,
            top: d.nextTop,
            resolved,
          };
          setModules((current) => [...current, spawned]);
          d.nextTop = resolved.bottom;
          d.lastModule = name;
          d.modulesSpawned += 1;
        }
      }
    }

    // ── la cámara sigue a la más baja ──
    const camera = state.camera;
    const targetY = (leaderY === Infinity ? -0.1 : leaderY) + 0.2;
    if (!d.cameraStarted) {
      camera.position.set(0, targetY, CAMERA_Z);
      d.cameraStarted = true;
    } else {
      const alpha = 1 - Math.exp(-10 * dt);
      camera.position.y += (targetY - camera.position.y) * alpha;
      camera.position.x = 0;
      camera.position.z = CAMERA_Z;
    }
    camera.rotation.set(0, 0, 0);
    cameraY.current = camera.position.y;

    // ── expirar efectos ──
    let fxChanged = false;
    fxRef.current.forEach((marbleFx, index) => {
      const body = bodies.current[index];
      if (!body) return;
      if (marbleFx.frozenUntil > 0 && now >= marbleFx.frozenUntil) {
        const position = body.translation();
        const blocked = bodies.current.some((other, otherIndex) => {
          if (!other || otherIndex === index) return false;
          const otherPosition = other.translation();
          const dx = otherPosition.x - position.x;
          const dy = otherPosition.y - position.y;
          return Math.hypot(dx, dy) < MARBLE_RADIUS * 2.1;
        });
        if (blocked) {
          marbleFx.frozenUntil = now + 0.1;
        } else {
          body.setBodyType(0, true); // Dynamic
          body.collider(0)?.setCollisionGroups(MARBLE_GROUPS);
          body.wakeUp();
          marbleFx.frozenUntil = 0;
          fxChanged = true;
        }
      }
      if (marbleFx.shrunkUntil > 0 && now >= marbleFx.shrunkUntil) {
        const collider = body.collider(0);
        collider?.setRadius(MARBLE_RADIUS);
        collider?.setHalfHeight(HALF_DEPTH);
        marbleFx.shrunkUntil = 0;
        fxChanged = true;
      }
      if (marbleFx.ringUntil > 0 && now >= marbleFx.ringUntil) {
        marbleFx.ringUntil = 0;
        fxChanged = true;
      }
    });
    if (fxChanged) bumpFx();

    // ── cruce de meta por Y, sin sensor físico ──
    if (finish) {
      bodies.current.forEach((body, index) => {
        if (!body || finished.current.has(index)) return;
        if (body.translation().y < finish.finishY) {
          finished.current.add(index);
          onFinisher(ROSTER[index].name);
        }
      });
    }
  });

  const grid = useMemo(() => spawnGrid(), []);

  return (
    <>
      <WallSegment top={WALLS_TOP} bottom={FIRST_MODULE_TOP} />
      {modules.map((spawnedModule) => (
        <Module
          key={spawnedModule.key}
          name={spawnedModule.name}
          top={spawnedModule.top}
          resolved={spawnedModule.resolved}
          consumed={consumed}
          onPickupHit={applyPickup}
        />
      ))}
      {finish && (
        <>
          <WallSegment top={director.current.nextTop} bottom={finish.floorY} />
          <FloorBlock floorY={finish.floorY} />
          <Suspense fallback={null}>
            <FinishLineVisual finishY={finish.finishY} />
          </Suspense>
        </>
      )}
      {ROSTER.map((character, index) => (
        <Marble
          key={character.name}
          index={index}
          character={character}
          start={grid[index]}
          registerBody={registerBody(index)}
          fx={fx[index]}
          simTime={simTime}
          isLeader={leaderIndex === index}
        />
      ))}
    </>
  );
}

function Marble({
  index,
  character,
  start,
  registerBody,
  fx,
  simTime,
  isLeader,
}: {
  index: number;
  character: Character;
  start: [number, number];
  registerBody: (body: RapierRigidBody | null) => void;
  fx: MarbleFx;
  simTime: React.MutableRefObject<number>;
  isLeader: boolean;
}) {
  const faceTexture = useTexture(character.image);
  const visual = useRef<THREE.Group>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const iceMaterial = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const now = simTime.current;
    if (visual.current) {
      const targetScale = fx.shrunkUntil > now ? 0.5 : 1;
      const current = visual.current.scale.x;
      visual.current.scale.setScalar(current + (targetScale - current) * 0.3);
    }
    if (ringMaterial.current) {
      const remaining = fx.ringUntil - now;
      ringMaterial.current.opacity = remaining > 0 ? Math.min(1, remaining / 1.5) : 0;
    }
    if (iceMaterial.current) {
      iceMaterial.current.opacity = fx.frozenUntil > now ? 0.55 : 0;
    }
  });

  return (
    <RigidBody
      ref={registerBody}
      type="dynamic"
      position={[start[0], start[1], 0]}
      colliders={false}
      ccd
      canSleep={false}
      enabledTranslations={[true, true, false]}
      enabledRotations={[false, false, true]}
      linearDamping={0.15}
      angularDamping={0.9}
      userData={{ marbleIndex: index }}
    >
      <CylinderCollider
        args={[HALF_DEPTH, MARBLE_RADIUS]}
        rotation={[Math.PI / 2, 0, 0]}
        friction={0.3}
        restitution={0.6}
        collisionGroups={MARBLE_GROUPS}
      />
      <group ref={visual}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[MARBLE_RADIUS, MARBLE_RADIUS, HALF_DEPTH * 2, 32]} />
          <meshStandardMaterial color={character.color} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, HALF_DEPTH + 0.001]}>
          <circleGeometry args={[MARBLE_RADIUS, 32]} />
          <meshBasicMaterial color={character.color} />
        </mesh>
        <mesh position={[0, 0, HALF_DEPTH + 0.002]}>
          <planeGeometry args={[MARBLE_RADIUS * 2, MARBLE_RADIUS * 2]} />
          <meshBasicMaterial map={faceTexture} transparent />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <sphereGeometry args={[0.11, 20, 20]} />
          <meshStandardMaterial
            ref={iceMaterial}
            color="#a6e0ff"
            emissive="#337399"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[0, 0, 0]} position={[0, 0, HALF_DEPTH + 0.003]}>
          <torusGeometry args={[0.1, 0.01, 8, 32]} />
          <meshBasicMaterial ref={ringMaterial} color="#b34df2" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <Html center position={[0, 0.15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="canicas-label">
          {isLeader ? '👑 ' : ''}
          {character.name}
        </div>
      </Html>
    </RigidBody>
  );
}
