// El marco del demo: carga los JSON de módulos, monta el Canvas con física
// y pone el overlay DOM (título, ganadores, botón de otra carrera).
import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Background } from './Background';
import { Race } from './Race';
import {
  CAMERA_FOV_DEG,
  CAMERA_Z,
  GRAVITY_Y,
  MODULE_NAMES,
  PALETTES,
  ROSTER,
  obstacleColorFor,
  type ModuleJson,
  type PaletteName,
} from './race_rules';

function freshSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

const PALETTE_ORDER: PaletteName[] = ['azul', 'neon', 'rosa'];

export default function CanicasDemo() {
  const [modulesData, setModulesData] = useState<Record<string, ModuleJson> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seed, setSeed] = useState(freshSeed);
  const [finishers, setFinishers] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const [paletteName, setPaletteName] = useState<PaletteName>('azul');
  const palette = PALETTES[paletteName];
  const obstacleColor = obstacleColorFor(palette);

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
    setPlaying(false);
    setSeed(freshSeed());
  };

  const nextPalette = () => {
    const index = PALETTE_ORDER.indexOf(paletteName);
    setPaletteName(PALETTE_ORDER[(index + 1) % PALETTE_ORDER.length]);
  };

  const winner = finishers[0] ?? null;

  return (
    <div
      className="canicas-demo"
      style={{ background: `linear-gradient(180deg, ${palette.skyStops[1][1]} 0%, ${palette.skyStops[3][1]} 100%)` }}
    >
      {loadError && <div className="canicas-status">⚠️ {loadError}</div>}
      {!loadError && !modulesData && <div className="canicas-status">cargando módulos…</div>}
      {modulesData && (
        <Canvas
          flat
          camera={{ fov: CAMERA_FOV_DEG, position: [0, -0.1, CAMERA_Z], near: 0.05, far: 120 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.6} />
          <directionalLight position={[3, 4.2, 8.6]} intensity={8} />
          <Background seed={seed} palette={palette} />
          <Suspense fallback={null}>
            <Physics gravity={[0, GRAVITY_Y, 0]} timeStep={1 / 60} paused={!playing}>
              <Race
                key={seed}
                seed={seed}
                modulesData={modulesData}
                onFinisher={(name) => setFinishers((current) => [...current, name])}
                playing={playing}
                obstacleColor={obstacleColor}
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
        {!winner && !playing && modulesData && (
          <button className="canicas-play-big" onClick={() => setPlaying(true)}>
            ▶
          </button>
        )}
        <div className="canicas-controls">
          {!winner && (
            <button onClick={() => setPlaying((current) => !current)}>{playing ? '⏸ pausa' : '▶ jugar'}</button>
          )}
          <button onClick={nextPalette}>🎨 {paletteName}</button>
          <button onClick={restart}>🎲 otra carrera</button>
        </div>
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
          container-type: size;
          background: linear-gradient(180deg, #0e7c92 0%, #13a0ae 60%, #1eb6be 100%);
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
        .canicas-controls button {
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
        .canicas-controls {
          align-self: flex-end;
          display: flex;
          gap: 8px;
        }
        .canicas-results button:hover,
        .canicas-controls button:hover { background: rgba(14, 86, 105, 0.95); }
        .canicas-play-big {
          pointer-events: auto;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 74px;
          height: 74px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.75);
          background: rgba(4, 34, 44, 0.72);
          color: #ffffff;
          font-size: 1.7rem;
          padding-left: 6px;
          cursor: pointer;
        }
        .canicas-play-big:hover { background: rgba(9, 58, 72, 0.9); }
        .canicas-label {
          display: flex;
          align-items: center;
          gap: 0.2em;
          color: #ffffff;
          font-family: 'DM Sans', Inter, system-ui, sans-serif;
          font-weight: 500;
          font-size: clamp(10px, 2.2cqh, 22px);
          white-space: nowrap;
          text-shadow: -1.5px 0 rgba(0,0,0,0.88), 1.5px 0 rgba(0,0,0,0.88), 0 -1.5px rgba(0,0,0,0.88), 0 1.5px rgba(0,0,0,0.88);
        }
        .canicas-label img { height: 1.1em; }
      `}</style>
    </div>
  );
}
