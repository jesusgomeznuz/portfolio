// El escenario: obstáculos, pickups, paredes y meta — el espejo visual de
// world/modules.rs + world/structures.rs + world/pickups.rs.
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF, useTexture } from '@react-three/drei';
import {
  RigidBody,
  CuboidCollider,
  RoundCuboidCollider,
  BallCollider,
  interactionGroups,
  type RapierRigidBody,
} from '@react-three/rapier';
import * as THREE from 'three';
import {
  HALF_DEPTH,
  WALL_HALF_WIDTH,
  type ResolvedModule,
  type ResolvedBox,
  type ResolvedSphere,
  type ResolvedTorus,
  type ResolvedPickup,
  type PickupVariant,
} from './race_rules';

export const GROUP_MARBLE = 0;
export const GROUP_FROZEN = 1;
export const GROUP_WORLD = 2;

export const WORLD_GROUPS = interactionGroups(GROUP_WORLD, [GROUP_MARBLE, GROUP_FROZEN, GROUP_WORLD]);
export const SENSOR_GROUPS = interactionGroups(GROUP_WORLD, [GROUP_MARBLE]);
export const MARBLE_GROUPS = interactionGroups(GROUP_MARBLE, [GROUP_MARBLE, GROUP_WORLD]);
export const FROZEN_GROUPS = interactionGroups(GROUP_FROZEN, [GROUP_WORLD]);

// palette.rs::obstacle_color() — white_matte (0.92,0.92,0.90) mezclado 50% con #073B4C
const OBSTACLE_COLOR = '#799399';

function spins(angvel: [number, number, number]): boolean {
  return angvel[0] !== 0 || angvel[1] !== 0 || angvel[2] !== 0;
}

function ObstacleBox({ box }: { box: ResolvedBox }) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<THREE.Mesh>(null);
  const pulse = useRef({ startedAt: -1, cooldownUntil: -1 });

  useEffect(() => {
    if (spins(box.angvel) && body.current) {
      body.current.setAngvel({ x: box.angvel[0], y: box.angvel[1], z: box.angvel[2] }, true);
    }
  }, [box]);

  useFrame(({ clock }) => {
    if (!box.bouncy || !visual.current) return;
    const now = clock.elapsedTime;
    const pulseDuration = 0.18;
    if (pulse.current.startedAt >= 0) {
      const t = (now - pulse.current.startedAt) / pulseDuration;
      if (t >= 1) {
        visual.current.scale.setScalar(1);
        pulse.current.startedAt = -1;
        pulse.current.cooldownUntil = now + 0.5;
      } else {
        visual.current.scale.setScalar(1 + 0.12 * Math.sin(t * Math.PI));
      }
    }
  });

  return (
    <RigidBody
      ref={body}
      type={spins(box.angvel) ? 'kinematicVelocity' : 'fixed'}
      position={[box.x, box.y, 0]}
      rotation={[0, 0, box.rot]}
      colliders={false}
      onCollisionEnter={
        box.bouncy
          ? () => {
              const clockNow = performance.now() / 1000;
              if (pulse.current.startedAt < 0 && clockNow > pulse.current.cooldownUntil) {
                pulse.current.startedAt = -2; // se fija al reloj del frame siguiente
              }
            }
          : undefined
      }
    >
      {box.borderRadius > 0 ? (
        <RoundCuboidCollider
          args={[
            Math.max(box.hx - box.borderRadius, 0.001),
            Math.max(box.hy - box.borderRadius, 0.001),
            Math.max(HALF_DEPTH - box.borderRadius, 0.001),
            box.borderRadius,
          ]}
          friction={box.friction}
          restitution={box.restitution}
          collisionGroups={WORLD_GROUPS}
        />
      ) : (
        <CuboidCollider
          args={[box.hx, box.hy, HALF_DEPTH]}
          friction={box.friction}
          restitution={box.restitution}
          collisionGroups={WORLD_GROUPS}
        />
      )}
      {box.borderRadius > 0 ? (
        <RoundedBox ref={visual} args={[box.hx * 2, box.hy * 2, HALF_DEPTH * 2]} radius={box.borderRadius} smoothness={4}>
          <meshStandardMaterial color={OBSTACLE_COLOR} roughness={0.85} />
        </RoundedBox>
      ) : (
        <mesh ref={visual}>
          <boxGeometry args={[box.hx * 2, box.hy * 2, HALF_DEPTH * 2]} />
          <meshStandardMaterial color={OBSTACLE_COLOR} roughness={0.85} />
        </mesh>
      )}
      <BouncyPulseClock pulse={pulse} enabled={box.bouncy} />
    </RigidBody>
  );
}

// El onCollisionEnter corre fuera del reloj de three; este ayudante ancla el
// inicio del pulso al elapsedTime del frame en que se detectó.
function BouncyPulseClock({
  pulse,
  enabled,
}: {
  pulse: React.MutableRefObject<{ startedAt: number; cooldownUntil: number }>;
  enabled: boolean;
}) {
  useFrame(({ clock }) => {
    if (enabled && pulse.current.startedAt === -2) {
      pulse.current.startedAt = clock.elapsedTime;
    }
  });
  return null;
}

function ObstacleSphere({ sphere }: { sphere: ResolvedSphere }) {
  return (
    <RigidBody type="fixed" position={[sphere.x, sphere.y, 0]} colliders={false}>
      <BallCollider
        args={[sphere.radius]}
        friction={sphere.friction}
        restitution={sphere.restitution}
        collisionGroups={WORLD_GROUPS}
      />
      <mesh>
        <sphereGeometry args={[sphere.radius, 24, 24]} />
        <meshStandardMaterial color={OBSTACLE_COLOR} roughness={0.85} />
      </mesh>
    </RigidBody>
  );
}

// El colisionador del torus es un anillo de bolas — la aproximación web del
// .compound VHACD que usa el juego nativo.
function ObstacleTorus({ torus }: { torus: ResolvedTorus }) {
  const body = useRef<RapierRigidBody>(null);
  useEffect(() => {
    if (spins(torus.angvel) && body.current) {
      body.current.setAngvel({ x: torus.angvel[0], y: torus.angvel[1], z: torus.angvel[2] }, true);
    }
  }, [torus]);

  const ballCount = 14;
  const balls = Array.from({ length: ballCount }, (_, i) => {
    const angle = (i / ballCount) * Math.PI * 2;
    return [Math.cos(angle) * torus.majorRadius, Math.sin(angle) * torus.majorRadius, 0] as [
      number,
      number,
      number,
    ];
  });

  return (
    <RigidBody
      ref={body}
      type={spins(torus.angvel) ? 'kinematicVelocity' : 'fixed'}
      position={[torus.x, torus.y, 0]}
      rotation={[0, 0, torus.rot]}
      colliders={false}
    >
      {balls.map((position, i) => (
        <BallCollider
          key={i}
          args={[torus.minorRadius]}
          position={position}
          friction={torus.friction}
          restitution={torus.restitution}
          collisionGroups={WORLD_GROUPS}
        />
      ))}
      <mesh>
        <torusGeometry args={[torus.majorRadius, torus.minorRadius, 16, 48]} />
        <meshStandardMaterial color={OBSTACLE_COLOR} roughness={0.85} />
      </mesh>
    </RigidBody>
  );
}

function ModuleImage({ image }: { image: { x: number; y: number; w: number; h: number; rot: number; texture: string } }) {
  const texture = useTexture(image.texture);
  return (
    <mesh position={[image.x, image.y, HALF_DEPTH + 0.001]} rotation={[0, 0, image.rot]}>
      <planeGeometry args={[image.w, image.h]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

// Los MISMOS .glb del juego (assets/effects/) con el tuning de pickups.rs
const ICON_TUNING: Record<PickupVariant, { axis: 'y' | 'z'; speed: number; scale: number }> = {
  freeze: { axis: 'y', speed: 1.0, scale: 13.5 },
  shrink: { axis: 'y', speed: 1.0, scale: 0.046 },
  swap: { axis: 'z', speed: 2.0, scale: 0.25 },
};

useGLTF.preload('/canicas/effects/freeze.glb');
useGLTF.preload('/canicas/effects/shrink.glb');
useGLTF.preload('/canicas/effects/swap.glb');

function PickupIcon({ variant }: { variant: PickupVariant }) {
  const { scene } = useGLTF(`/canicas/effects/${variant}.glb`);
  const model = useMemo(() => scene.clone(true), [scene]);
  const icon = useRef<THREE.Group>(null);
  const tuning = ICON_TUNING[variant];
  useFrame((_, delta) => {
    if (!icon.current) return;
    icon.current.rotation[tuning.axis] += tuning.speed * delta;
  });
  return (
    <group ref={icon} scale={tuning.scale}>
      <primitive object={model} />
    </group>
  );
}

export function Pickup({
  pickup,
  onHit,
}: {
  pickup: ResolvedPickup;
  onHit: (pickup: ResolvedPickup, marbleIndex: number) => void;
}) {
  return (
    <RigidBody type="fixed" position={[pickup.x, pickup.y, 0]} rotation={[0, 0, pickup.rot]} colliders={false}>
      <CuboidCollider
        args={[pickup.w / 2, pickup.h / 2, HALF_DEPTH]}
        sensor
        collisionGroups={SENSOR_GROUPS}
        onIntersectionEnter={(payload) => {
          const userData = payload.other.rigidBody?.userData as { marbleIndex?: number } | undefined;
          if (userData?.marbleIndex !== undefined) onHit(pickup, userData.marbleIndex);
        }}
      />
      <Suspense fallback={null}>
        <PickupIcon variant={pickup.variant} />
      </Suspense>
    </RigidBody>
  );
}

export function WallSegment({ top, bottom }: { top: number; bottom: number }) {
  const halfHeight = (top - bottom) / 2;
  const centerY = (top + bottom) / 2;
  return (
    <>
      {[-1, 1].map((side) => (
        <RigidBody key={side} type="fixed" position={[side * (WALL_HALF_WIDTH + 0.05), centerY, 0]} colliders={false}>
          <CuboidCollider
            args={[0.05, halfHeight, HALF_DEPTH]}
            restitution={0.05}
            friction={0.15}
            collisionGroups={WORLD_GROUPS}
          />
          <mesh>
            <boxGeometry args={[0.1, halfHeight * 2, HALF_DEPTH * 2]} />
            <meshStandardMaterial color={OBSTACLE_COLOR} roughness={0.85} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

export function FloorBlock({ floorY }: { floorY: number }) {
  const halfHeight = 3.0;
  return (
    <RigidBody type="fixed" position={[0, floorY - halfHeight, 0]} colliders={false}>
      <CuboidCollider
        args={[10, halfHeight, 3]}
        restitution={0.05}
        friction={0.7}
        collisionGroups={WORLD_GROUPS}
      />
      <mesh>
        <boxGeometry args={[20, halfHeight * 2, 6]} />
        <meshStandardMaterial color={OBSTACLE_COLOR} roughness={0.85} />
      </mesh>
    </RigidBody>
  );
}

export function FinishLineVisual({ finishY }: { finishY: number }) {
  const texture = useTexture('/canicas/img/finish.png');
  return (
    <mesh position={[0, finishY, HALF_DEPTH]}>
      <planeGeometry args={[1.1, 0.14]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

export function Module({
  name,
  top,
  resolved,
  consumed,
  onPickupHit,
}: {
  name: string;
  top: number;
  resolved: ResolvedModule;
  consumed: Set<string>;
  onPickupHit: (pickup: ResolvedPickup, marbleIndex: number) => void;
}) {
  return (
    <group name={`module-${name}`}>
      {resolved.boxes.map((box, i) => (
        <ObstacleBox key={i} box={box} />
      ))}
      {resolved.spheres.map((sphere, i) => (
        <ObstacleSphere key={i} sphere={sphere} />
      ))}
      {resolved.tori.map((torus, i) => (
        <ObstacleTorus key={i} torus={torus} />
      ))}
      <Suspense fallback={null}>
        {resolved.images.map((image, i) => (
          <ModuleImage key={i} image={image} />
        ))}
      </Suspense>
      {resolved.pickups
        .filter((pickup) => !consumed.has(pickup.id))
        .map((pickup) => (
          <Pickup key={pickup.id} pickup={pickup} onHit={onPickupHit} />
        ))}
      <WallSegment top={top} bottom={resolved.bottom} />
    </group>
  );
}
