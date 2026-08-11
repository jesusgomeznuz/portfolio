import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import FlowViewer from './FlowViewer';
import canicasGenerated from '../data/flow-viewer.generated.json';
import canicasOverlay from '../data/flow-viewer-overlay.json';
import musicalGenerated from '../data/flow-musical.generated.json';
import musicalOverlay from '../data/flow-musical-overlay.json';

const CanicasDemo = lazy(() => import('./canicas-demo/CanicasDemo'));
const MusicalDemo = lazy(() => import('./musical-demo/MusicalDemo'));

class DemoBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return <span className="msg">el demo no pudo cargar — recarga la página</span>;
    }
    return this.props.children;
  }
}

type ProjectId = 'canicas' | 'musical' | 'rapier';

interface Props {
  demoUrl: string;
}

const PROJECTS: { id: ProjectId; name: string; demoLabel: string; githubUrl: string }[] = [
  {
    id: 'canicas',
    name: 'canicasbrawl-rapier',
    demoLabel: 'Portrait WASM build — the direct successor to the original marble idea.',
    githubUrl: 'https://github.com/jesusgomeznuz/canicasbrawl-rapier',
  },
  {
    id: 'musical',
    name: 'musical-path-rapier',
    demoLabel: 'Portrait WASM build — kinematic physics, the path plays the song.',
    githubUrl: 'https://github.com/jesusgomeznuz/musical-path-rapier',
  },
  {
    id: 'rapier',
    name: 'rapier-bevy',
    demoLabel: 'No game here — a small scene that proves the plugin wiring.',
    githubUrl: 'https://github.com/jesusgomeznuz/rapier-bevy',
  },
];

export default function ProjectWorkbench({ demoUrl }: Props) {
  const [selected, setSelected] = useState<ProjectId>('canicas');
  const active = PROJECTS.find((p) => p.id === selected)!;

  return (
    <div className="pw-root">
      <style>{`
        .pw-root { font-family: Futura, Jost, 'Century Gothic', sans-serif; }

        .pw-tabs { display: flex; gap: 4px; border-bottom: 1.2px solid var(--line); align-items: flex-end; }
        .pw-tab {
          position: relative;
          padding: 13px 18px;
          background: transparent;
          border: none;
          cursor: pointer;
          font: 500 13px/1 ui-monospace, Menlo, monospace;
          color: var(--muted);
        }
        .pw-tab span { position: relative; z-index: 1; }
        .pw-tab.active { color: var(--fg); }
        .pw-tab.active::before {
          content: '';
          position: absolute;
          inset: 0 0 -1.2px 0;
          border: 1.2px solid var(--line);
          border-bottom: none;
          border-radius: 10px 10px 0 0;
          background: var(--band);
        }

        .pw-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; padding: 26px 0 0; align-items: stretch; }
        @media (max-width: 900px) { .pw-grid { grid-template-columns: 1fr; } }

        .pw-panel {
          border: 1.2px solid var(--line);
          border-radius: 12px;
          background: var(--card);
          display: flex;
          flex-direction: column;
          gap: 14px;
          height: min(680px, 76vh);
        }
        .pw-panel-who { padding: 24px; gap: 18px; }

        /* El explorador no vive en una cajita: igual que el demo, respira sobre
           la página y su único marco es el espacio. */
        .pw-panel-arch {
          display: flex; flex-direction: column; gap: 14px;
          height: min(680px, 76vh); padding: 8px 4px;
        }

        .pw-panel-label { font: 500 9.5px/1 Futura, Jost, sans-serif; letter-spacing: .16em; color: var(--muted); }

        /* WHO */
        .pw-who-head { display: flex; gap: 16px; align-items: flex-start; }
        .pw-photo {
          width: 66px; height: 66px; flex: none; border-radius: 10px;
          border: 1.2px dashed var(--line2); display: grid; place-items: center;
          font: 400 9px/1 Jost, sans-serif; color: var(--muted);
        }
        .pw-who-name { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
        .pw-who-name .name { font: 700 20px/1.1 Futura, Jost, sans-serif; color: var(--fg); }
        .pw-who-name .loc { font: 400 11.5px/1.4 Jost, sans-serif; color: var(--muted); }
        .pw-bio { margin: 0; font: 400 13px/1.65 Jost, sans-serif; color: var(--muted); }
        .pw-bio .mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--fg); }
        .pw-hr { height: 1px; background: var(--ghost); }
        .pw-links { display: flex; flex-direction: column; gap: 2px; }
        .pw-links a {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 0; font: 400 13px/1 Jost, sans-serif; color: var(--fg);
        }
        .pw-links a .arrow { color: var(--line); }
        .pw-cv {
          margin-top: auto; padding: 12px; border-radius: 8px; border: 1.2px solid var(--line);
          background: var(--band); text-align: center; font: 700 12.5px/1 Futura, Jost, sans-serif; color: var(--fg);
        }

        /* PLAY IT — el player desnudo, sin chrome alrededor */
        .pw-panel-play {
          display: flex; align-items: center; justify-content: center;
          height: min(680px, 76vh); padding: 8px;
        }
        .pw-panel-play .msg { font: 400 12px/1.6 Jost, sans-serif; color: var(--muted); text-align: center; padding: 16px; }
        .pw-panel-play iframe {
          width: 100%; height: 100%; border: none; display: block;
          border-radius: 14px; box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
        }
        .pw-demo-embed { display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; }
        .pw-demo-embed .canicas-demo, .pw-demo-embed .musical-demo { height: 100%; max-height: 100%; width: auto; }

        /* ARCHITECTURE */
        .pw-arch-body { flex: 1; min-height: 0; display: flex; }
        .pw-arch-placeholder { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 18px; }
        .pw-node { border: 1.5px solid; border-radius: 9px; padding: 9px 18px; font: 600 12px ui-monospace, Menlo, monospace; }
        .pw-node-root { border-color: var(--line); color: var(--fg); font-size: 13px; padding: 9px 20px; }
        .pw-node-active { border-color: var(--line); color: var(--line); }
        .pw-node-secondary { border-color: var(--line2); color: var(--muted); }
        .pw-connector { width: 1px; height: 20px; background: var(--dash); }
        .pw-row { display: flex; gap: 20px; }
        .pw-arch-footer { padding-top: 12px; border-top: 1px solid var(--ghost); font: 400 11px/1.5 Jost, sans-serif; color: var(--muted); }
        .pw-arch-footer a { color: var(--line); }
      `}</style>

      <div className="pw-tabs">
        {PROJECTS.map((p) => (
          <button
            key={p.id}
            className={`pw-tab${selected === p.id ? ' active' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      <div className="pw-grid">
        <section className="pw-panel pw-panel-who">
          <div className="pw-panel-label">WHO</div>
          <div className="pw-who-head">
            <div className="pw-photo">photo</div>
            <div className="pw-who-name">
              <div className="name">Jesus</div>
              <div className="loc">Mexico · remote or relocating</div>
            </div>
          </div>
          <p className="pw-bio">
            I build simulations in Rust and C#. At Jammable I wrote a Rapier engine that renders marble
            videos in milliseconds, locally, no cloud — and let other people make their own go viral with
            it. Since then I've been building <span className="mono">rapier-bevy</span> and two games on
            top of it.
          </p>
          <div className="pw-hr" />
          <div className="pw-links">
            <a href="https://github.com/jesusgomeznuz" target="_blank" rel="noreferrer">GitHub <span className="arrow">↗</span></a>
            <a href="https://www.instagram.com/canicasbrawl/" target="_blank" rel="noreferrer">Instagram — the marble videos <span className="arrow">↗</span></a>
            <a href="https://www.tiktok.com/@canicasbrawl" target="_blank" rel="noreferrer">TikTok — the marble videos <span className="arrow">↗</span></a>
            <a href="#" target="_blank" rel="noreferrer">X <span className="arrow">↗</span></a>
            <a href="mailto:jesus.gomeznuz@gmail.com">jesus.gomeznuz@gmail.com <span className="arrow">↗</span></a>
          </div>
          <a className="pw-cv" href="/cv.pdf" target="_blank" rel="noreferrer">Download CV</a>
        </section>

        <section className="pw-panel-play">
          {selected === 'rapier' ? (
            <iframe src={demoUrl} title="Rapier Physics Demo" allow="accelerometer" />
          ) : selected === 'canicas' ? (
            <div className="pw-demo-embed">
              <DemoBoundary>
                <Suspense fallback={<span className="msg">cargando demo…</span>}>
                  <CanicasDemo />
                </Suspense>
              </DemoBoundary>
            </div>
          ) : (
            <div className="pw-demo-embed">
              <DemoBoundary>
                <Suspense fallback={<span className="msg">cargando demo…</span>}>
                  <MusicalDemo />
                </Suspense>
              </DemoBoundary>
            </div>
          )}
        </section>

        <section className="pw-panel-arch">
          {selected === 'canicas' ? (
            <div className="pw-arch-body">
              <div style={{ flex: 1, minWidth: 0 }}>
                <FlowViewer key="canicas" generated={canicasGenerated} overlay={canicasOverlay} />
              </div>
            </div>
          ) : selected === 'musical' ? (
            <div className="pw-arch-body">
              <div style={{ flex: 1, minWidth: 0 }}>
                <FlowViewer key="musical" generated={musicalGenerated} overlay={musicalOverlay} />
              </div>
            </div>
          ) : (
            <div className="pw-arch-body">
              <div className="pw-arch-placeholder">
                <div className="pw-node pw-node-root">lib.rs — engine root</div>
                <div className="pw-connector" />
                <div className="pw-row">
                  <div className="pw-node pw-node-active">physics_step ↳</div>
                  <div className="pw-node pw-node-secondary">colliders</div>
                  <div className="pw-node pw-node-secondary">bevy_plugin</div>
                </div>
              </div>
            </div>
          )}
          <div className="pw-arch-footer">
            Generated from the source, not drawn.{' '}
            <a href={active.githubUrl} target="_blank" rel="noreferrer">Repo ↗</a>
          </div>
        </section>
      </div>
    </div>
  );
}
