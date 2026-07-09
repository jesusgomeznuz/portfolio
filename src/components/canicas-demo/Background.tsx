// El fondo del juego: cielo, estrellas y nubes — espejo de
// background/{palette,sky,stars,clouds}.rs con la paleta azul default.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeRng, type Palette } from './race_rules';

export function Background({ seed, palette }: { seed: number; palette: Palette }) {
  return (
    <>
      <Sky palette={palette} />
      <StarField seed={seed} />
      <Clouds seed={seed} palette={palette} />
    </>
  );
}

// El cielo es un quad gigante detrás de todo que sigue a la cámara: en
// pantalla solo se ve la rebanada media del gradiente, igual que en sky.rs.
function Sky({ palette }: { palette: Palette }) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    for (const [t, color] of palette.skyStops) gradient.addColorStop(t, color);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, 256);
    return new THREE.CanvasTexture(canvas);
  }, [palette]);

  useFrame(({ camera }) => {
    if (mesh.current) mesh.current.position.y = camera.position.y;
  });

  return (
    <mesh ref={mesh} position={[0, 0, -50]}>
      <planeGeometry args={[100, 200]} />
      <meshBasicMaterial map={texture} depthWrite={false} />
    </mesh>
  );
}

interface Star {
  x: number;
  yOffset: number;
  size: number;
  phase: number;
  frequency: number;
  baseAlpha: number;
}

// stars.rs: jitter sobre grid, estrella de 4 puntas, twinkle por seno.
function StarField({ seed }: { seed: number }) {
  const geometry = useMemo(() => {
    const outerRadius = 1;
    const innerRadius = 0.38;
    const shape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI / 2 - (i * Math.PI) / 4;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  const stars = useMemo<Star[]>(() => {
    const rng = makeRng((seed ^ 0x9e3779b9) >>> 0);
    const count = 110;
    const xSpread = 7.5;
    const ySpread = 14.0;
    const cols = Math.round(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = (xSpread * 2) / cols;
    const cellH = (ySpread * 2) / rows;
    const list: Star[] = [];
    outer: for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (row * cols + col >= count) break outer;
        list.push({
          x: -xSpread + col * cellW + rng() * cellW,
          yOffset: -ySpread + row * cellH + rng() * cellH,
          size: 0.015 + rng() * (0.1 - 0.015),
          phase: rng() * Math.PI * 2,
          frequency: 0.7 + rng() * (2.1 - 0.7),
          baseAlpha: Math.min(1, Math.max(0.2, 0.25 + (rng() * 0.3 - 0.15))),
        });
      }
    }
    return list;
  }, [seed]);

  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  useFrame(({ camera, clock }) => {
    const elapsed = clock.elapsedTime;
    stars.forEach((star, i) => {
      const mesh = meshes.current[i];
      if (mesh) mesh.position.y = camera.position.y + star.yOffset;
      const material = materials.current[i];
      if (material) {
        const alpha = star.baseAlpha + 0.2 * Math.sin(star.phase + elapsed * star.frequency * Math.PI * 2);
        material.opacity = Math.min(1, Math.max(0, alpha));
      }
    });
  });

  return (
    <>
      {stars.map((star, i) => (
        <mesh
          key={i}
          ref={(instance) => {
            meshes.current[i] = instance;
          }}
          geometry={geometry}
          position={[star.x, star.yOffset, -15]}
          scale={star.size}
        >
          <meshBasicMaterial
            ref={(instance) => {
              materials.current[i] = instance;
            }}
            color="#ffffff"
            transparent
            opacity={star.baseAlpha}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

// clouds.rs: base plana + puffs redondeados, tres capas con parallax y wrap.
const CLOUD_BLOBS: Array<[number, number, number, number]> = [
  [-0.55, -0.05, 0.9, 0.18],
  [0.0, -0.05, 1.0, 0.18],
  [0.55, -0.05, 0.88, 0.18],
  [-0.28, 0.48, 0.65, 0.6],
  [0.0, 0.58, 0.72, 0.6],
  [0.28, 0.48, 0.6, 0.6],
];

const CLOUD_LAYERS = [
  { z: -8, count: 4, tone: 'near' as const, scaleMin: 0.42, scaleMax: 0.65, xSpread: 4.0, floatAmplitude: 0.22, parallaxFactor: 0.6 },
  { z: -12, count: 6, tone: 'mid' as const, scaleMin: 0.36, scaleMax: 0.56, xSpread: 5.5, floatAmplitude: 0.13, parallaxFactor: 0.78 },
  { z: -14, count: 8, tone: 'far' as const, scaleMin: 0.28, scaleMax: 0.44, xSpread: 6.5, floatAmplitude: 0.06, parallaxFactor: 0.93 },
];

interface Cloud {
  baseX: number;
  baseY: number;
  z: number;
  color: string;
  scale: number;
  phase: number;
  frequency: number;
  amplitude: number;
  viewHalfY: number;
  parallaxFactor: number;
}

function Clouds({ seed, palette }: { seed: number; palette: Palette }) {
  const clouds = useMemo<Cloud[]>(() => {
    const rng = makeRng((seed ^ 0x07bb0142) >>> 0);
    const tones = { near: palette.cloudNear, mid: palette.cloudMid, far: palette.cloudFar };
    const list: Cloud[] = [];
    for (const layer of CLOUD_LAYERS) {
      const cols = Math.round(Math.sqrt(layer.count));
      const rows = Math.ceil(layer.count / cols);
      const ySpread = 7.0;
      const cellW = (layer.xSpread * 2) / cols;
      const cellH = (ySpread * 2) / rows;
      outer: for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (row * cols + col >= layer.count) break outer;
          list.push({
            baseX: -layer.xSpread + col * cellW + rng() * cellW,
            baseY: -ySpread + row * cellH + rng() * cellH,
            z: layer.z,
            color: tones[layer.tone],
            scale: layer.scaleMin + rng() * (layer.scaleMax - layer.scaleMin),
            phase: rng() * Math.PI * 2,
            frequency: 0.04 + rng() * 0.08,
            amplitude: layer.floatAmplitude * (0.7 + rng() * 0.6),
            viewHalfY: (2.5 - layer.z) * 0.5774,
            parallaxFactor: layer.parallaxFactor,
          });
        }
      }
    }
    return list;
  }, [seed, palette]);

  const groups = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ camera, clock }) => {
    const elapsed = clock.elapsedTime;
    const cameraY = camera.position.y;
    clouds.forEach((cloud, i) => {
      const group = groups.current[i];
      if (!group) return;
      const floatX = cloud.amplitude * Math.sin(cloud.phase + elapsed * cloud.frequency * Math.PI * 2);
      const rawRelY = cloud.baseY + cameraY * (cloud.parallaxFactor - 1);
      const wrapRange = (cloud.viewHalfY + 2) * 2;
      const wrappedRelY = euclidMod(rawRelY + wrapRange / 2, wrapRange) - wrapRange / 2;
      group.position.x = cloud.baseX + floatX;
      group.position.y = cameraY + wrappedRelY;
    });
  });

  return (
    <>
      {clouds.map((cloud, i) => (
        <group
          key={i}
          ref={(instance) => {
            groups.current[i] = instance;
          }}
          position={[cloud.baseX, cloud.baseY, cloud.z]}
        >
          {CLOUD_BLOBS.map(([bx, by, br, bz], j) => (
            <mesh
              key={j}
              position={[bx * cloud.scale * 0.5, by * cloud.scale * 0.42, 0]}
              scale={[cloud.scale * br, cloud.scale * br * 0.85, cloud.scale * br * bz]}
            >
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshBasicMaterial color={cloud.color} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function euclidMod(value: number, range: number): number {
  return ((value % range) + range) % range;
}
