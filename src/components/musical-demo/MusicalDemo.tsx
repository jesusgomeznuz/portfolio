// El marco del demo: carga los JSONs del pick, monta el Canvas y pone el
// overlay DOM (viñeta de borde, cantante actual, controles).
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Show, type ShowData } from './Show';
import {
  CAM_FOV_DEG,
  CAM_HEIGHT,
  CHARACTER_COLORS,
  PALETTES,
  characterImage,
  parseCorridor,
  parseDecoys,
  parseExplosions,
  parseVoiceTimeline,
  parseWavySegments,
  sampleStops,
  type PaletteName,
} from './song_rules';

const PICK = '129';
const PALETTE_ORDER: PaletteName[] = ['turquesa', 'rosa', 'lavanda'];

export default function MusicalDemo() {
  const [data, setData] = useState<ShowData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paletteName, setPaletteName] = useState<PaletteName>('turquesa');
  const [singer, setSinger] = useState<string>('perla');
  const [ended, setEnded] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const clockRef = useRef(0);
  const edgeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pickFile = async (name: string) => {
      const response = await fetch(`/musical/picks/${PICK}/${name}.json`);
      if (!response.ok) throw new Error(`no se pudo cargar ${name}`);
      return response.json();
    };
    Promise.all([
      pickFile('corridor_export'),
      pickFile('voice_swap_timeline'),
      pickFile('explosions'),
      pickFile('wavy_segments'),
      pickFile('decoy_positions'),
    ])
      .then(([corridor, voices, explosions, wavy, decoys]) => {
        if (cancelled) return;
        setData({
          corridor: parseCorridor(corridor),
          voices: parseVoiceTimeline(voices),
          explosions: parseExplosions(explosions),
          wavyWindows: parseWavySegments(wavy),
          decoys: parseDecoys(decoys),
        });
      })
      .catch((error) => {
        if (!cancelled) setLoadError(String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const restart = () => {
    clockRef.current = 0;
    setPlaying(false);
    setEnded(false);
    setSinger(data?.voices[0]?.character ?? 'perla');
    setEpoch((current) => current + 1);
  };

  const nextPalette = () => {
    const index = PALETTE_ORDER.indexOf(paletteName);
    setPaletteName(PALETTE_ORDER[(index + 1) % PALETTE_ORDER.length]);
  };

  const palette = PALETTES[paletteName];
  const [topR, topG, topB] = sampleStops(palette.extStops, 0);
  const [botR, botG, botB] = sampleStops(palette.extStops, 1);

  return (
    <div
      className="musical-demo"
      style={{
        background: `linear-gradient(180deg, rgb(${topR | 0},${topG | 0},${topB | 0}), rgb(${botR | 0},${botG | 0},${botB | 0}))`,
      }}
    >
      {loadError && <div className="musical-status">⚠️ {loadError}</div>}
      {!loadError && !data && <div className="musical-status">cargando pick…</div>}
      {data && (
        <Canvas
          flat
          camera={{ fov: CAM_FOV_DEG, position: [0, CAM_HEIGHT, 0], near: 0.05, far: 60 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={2.2} />
          <directionalLight position={[1, 3, 2]} intensity={3.5} />
          <Suspense fallback={null}>
            <Show
              key={epoch}
              data={data}
              palette={palette}
              playing={playing}
              clockRef={clockRef}
              edgeRef={edgeRef}
              onSingerChange={setSinger}
              onEnded={() => setEnded(true)}
            />
          </Suspense>
        </Canvas>
      )}
      <div ref={edgeRef} className="musical-edge" />

      <div className="musical-hud">
        <div className="musical-title">
          <span>musical path — demo en vivo, matemática pura</span>
        </div>
        <div className="musical-singer">
          <img src={characterImage(singer)} alt={singer} />
          <span style={{ color: CHARACTER_COLORS[singer] ?? '#fff' }}>{singer}</span>
        </div>
        {!playing && data && !ended && (
          <button className="musical-play-big" onClick={() => setPlaying(true)}>
            ▶
          </button>
        )}
        {ended && (
          <div className="musical-results">
            <div>🎵 fin del pick</div>
            <button onClick={restart}>⟲ otra vez</button>
          </div>
        )}
        <div className="musical-controls">
          {!ended && (
            <button onClick={() => setPlaying((current) => !current)}>{playing ? '⏸ pausa' : '▶ tocar'}</button>
          )}
          <button onClick={nextPalette}>🎨 {paletteName}</button>
          <button onClick={restart}>⟲ reiniciar</button>
        </div>
      </div>

      <style>{`
        .musical-demo {
          position: relative;
          aspect-ratio: 9 / 16;
          max-height: 82vh;
          width: auto;
          margin: 0 auto;
          border-radius: 18px;
          overflow: hidden;
          container-type: size;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
        }
        .musical-demo canvas { display: block; }
        .musical-status {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #ffffff;
          font-family: ui-monospace, monospace;
          font-size: 0.9rem;
        }
        .musical-edge {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 18px;
        }
        .musical-hud {
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 14px;
        }
        .musical-title {
          color: rgba(255, 255, 255, 0.92);
          font-family: ui-monospace, monospace;
          font-size: 0.72rem;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
        }
        .musical-singer {
          position: absolute;
          top: 40px;
          left: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.28);
          border-radius: 999px;
          padding: 5px 14px 5px 6px;
          font-family: ui-monospace, monospace;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .musical-singer img {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.85);
          object-fit: cover;
        }
        .musical-play-big {
          pointer-events: auto;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 74px;
          height: 74px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.75);
          background: rgba(0, 30, 40, 0.6);
          color: #ffffff;
          font-size: 1.7rem;
          padding-left: 6px;
          cursor: pointer;
        }
        .musical-play-big:hover { background: rgba(0, 50, 65, 0.8); }
        .musical-results {
          pointer-events: auto;
          align-self: center;
          margin-top: 30vh;
          background: rgba(0, 25, 35, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 14px;
          padding: 16px 24px;
          text-align: center;
          color: #ffffff;
          font-family: ui-monospace, monospace;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .musical-controls {
          align-self: flex-end;
          display: flex;
          gap: 8px;
        }
        .musical-controls button,
        .musical-results button {
          pointer-events: auto;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: rgba(0, 30, 40, 0.6);
          color: #ffffff;
          border-radius: 10px;
          padding: 8px 14px;
          font-family: ui-monospace, monospace;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .musical-controls button:hover,
        .musical-results button:hover { background: rgba(0, 50, 65, 0.85); }
      `}</style>
    </div>
  );
}
