// El marco del demo: carga los JSON de módulos, monta el Canvas con física
// y pone el overlay DOM (título, ganadores, botón de otra carrera).
import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Race } from './Race';
import {
  CAMERA_FOV_DEG,
  CAMERA_Z,
  GRAVITY_Y,
  MODULE_NAMES,
  ROSTER,
  type ModuleJson,
} from './race_rules';

function freshSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export default function CanicasDemo() {
  const [modulesData, setModulesData] = useState<Record<string, ModuleJson> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seed, setSeed] = useState(freshSeed);
  const [finishers, setFinishers] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      MODULE_NAMES.map(async (name) => {
        const response = await fetch(`/canicas/modules/${name}.json`);
        if (!response.ok) throw new Error(`no se pudo cargar el módulo '${name}'`);
        return [name, (await response.json()) as ModuleJson] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setModulesData(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const restart = () => {
    setFinishers([]);
    setSeed(freshSeed());
  };

  const winner = finishers[0] ?? null;

  return (
    <div className="canicas-demo">
      {loadError && <div className="canicas-status">⚠️ {loadError}</div>}
      {!loadError && !modulesData && <div className="canicas-status">cargando módulos…</div>}
      {modulesData && (
        <Canvas
          camera={{ fov: CAMERA_FOV_DEG, position: [0, -0.1, CAMERA_Z], near: 0.05, far: 120 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.1} />
          <directionalLight position={[-2, 3, 4]} intensity={1.6} />
          <Stars radius={40} depth={30} count={900} factor={1.5} saturation={0.4} fade speed={0.6} />
          <Suspense fallback={null}>
            <Physics gravity={[0, GRAVITY_Y, 0]} timeStep={1 / 60}>
              <Race
                key={seed}
                seed={seed}
                modulesData={modulesData}
                onFinisher={(name) => setFinishers((current) => [...current, name])}
              />
            </Physics>
          </Suspense>
        </Canvas>
      )}

      <div className="canicas-hud">
        <div className="canicas-title">
          <img src="/canicas/img/canicas_logo.png" alt="CanicasBrawl" />
          <span>demo en vivo — rapier.js</span>
        </div>
        {winner && (
          <div className="canicas-results">
            <div className="canicas-winner">🏆 {winner}</div>
            <ol>
              {finishers.slice(0, 5).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ol>
            <button onClick={restart}>🎲 otra carrera</button>
          </div>
        )}
        {!winner && (
          <button className="canicas-restart" onClick={restart}>
            🎲 otra carrera
          </button>
        )}
      </div>

      <style>{`
        .canicas-demo {
          position: relative;
          aspect-ratio: 9 / 16;
          max-height: 82vh;
          width: auto;
          margin: 0 auto;
          border-radius: 18px;
          overflow: hidden;
          background: linear-gradient(180deg, #073b4c 0%, #0e7c92 45%, #13a0ae 75%, #1eb6be 100%);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
        }
        .canicas-demo canvas { display: block; }
        .canicas-status {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #e8f6f8;
          font-family: ui-monospace, monospace;
          font-size: 0.9rem;
        }
        .canicas-hud {
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 14px;
        }
        .canicas-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #d9f3f6;
          font-family: ui-monospace, monospace;
          font-size: 0.75rem;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
        }
        .canicas-title img { height: 30px; }
        .canicas-results {
          pointer-events: auto;
          align-self: center;
          margin-bottom: 18vh;
          background: rgba(4, 34, 44, 0.88);
          border: 1px solid rgba(120, 220, 235, 0.35);
          border-radius: 14px;
          padding: 16px 24px;
          text-align: center;
          color: #eafcff;
          font-family: ui-monospace, monospace;
        }
        .canicas-winner { font-size: 1.15rem; margin-bottom: 8px; }
        .canicas-results ol { margin: 0 0 12px; padding-left: 1.4em; text-align: left; font-size: 0.85rem; }
        .canicas-results button,
        .canicas-restart {
          pointer-events: auto;
          border: 1px solid rgba(120, 220, 235, 0.5);
          background: rgba(9, 58, 72, 0.85);
          color: #eafcff;
          border-radius: 10px;
          padding: 8px 14px;
          font-family: ui-monospace, monospace;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .canicas-restart { align-self: flex-end; }
        .canicas-results button:hover,
        .canicas-restart:hover { background: rgba(14, 86, 105, 0.95); }
        .canicas-label {
          color: #ffffff;
          font-family: ui-monospace, monospace;
          font-size: 10px;
          white-space: nowrap;
          text-shadow: 0 0 3px #000, 0 0 3px #000, 0 1px 2px #000;
          transform: translateY(-6px);
        }
      `}</style>
    </div>
  );
}
