import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import FlowDiagramExplorer from './FlowDiagramExplorer';
import type { RepoFlow } from '../data/flow-tree';
import type { DiagramLevel } from '../data/flow-diagrams';

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
  canicasFlow: RepoFlow;
  canicasDiagrams: DiagramLevel[];
}

const PROJECTS: { id: ProjectId; name: string; subtitle: string; githubUrl: string }[] = [
  { id: 'canicas', name: 'canicasbrawl', subtitle: 'demo · arquitectura', githubUrl: 'https://github.com/jesusgomeznuz/canicasbrawl-rapier' },
  { id: 'musical', name: 'musical-path', subtitle: 'demo · arquitectura', githubUrl: 'https://github.com/jesusgomeznuz/musical-path-rapier' },
  { id: 'rapier', name: 'rapier-bevy', subtitle: 'demo · engine', githubUrl: 'https://github.com/jesusgomeznuz/rapier-bevy' },
];

export default function ProjectWorkbench({ demoUrl, canicasFlow, canicasDiagrams }: Props) {
  const [selected, setSelected] = useState<ProjectId>('canicas');
  const active = PROJECTS.find((p) => p.id === selected)!;

  return (
    <div className="pw-root">
      <style>{`
        .pw-root { display: flex; flex-direction: column; min-height: 0; height: 100%; font-family: Inter, system-ui, sans-serif; }

        .pw-tabs { display: flex; align-items: stretch; border-bottom: 1px solid #1a1a1e; flex-shrink: 0; }
        .pw-tab {
          cursor: pointer;
          padding: 12px 22px;
          border-right: 1px solid #1a1a1e;
          border-top: 2px solid transparent;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: background 0.15s;
        }
        .pw-tab:hover { background: #0e0e11; }
        .pw-tab.active { border-top-color: #b8e832; }
        .pw-tab .repo { font: 600 13px 'JetBrains Mono', monospace; color: #ededf0; }
        .pw-tab .subtitle { font: 400 10px 'JetBrains Mono', monospace; color: #78787f; }
        .pw-tabs-trail { flex: 1; display: flex; align-items: center; justify-content: flex-end; padding: 0 22px; gap: 14px; }
        .pw-tabs-trail .note { font: 400 11px Inter; color: #6f6f78; }
        .pw-tabs-trail a { font: 500 12px 'JetBrains Mono', monospace; }

        .pw-split { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; }

        .pw-pane-arch { position: relative; border-right: 1px solid #1a1a1e; background: #0a0a0c; display: flex; flex-direction: column; overflow: hidden; }
        .pw-pane-label { position: absolute; top: 16px; left: 20px; font: 600 10px/1 'JetBrains Mono', monospace; letter-spacing: .12em; text-transform: uppercase; color: #6f6f78; z-index: 1; }
        .pw-arch-inner { flex: 1; min-height: 0; padding: 46px 20px 20px; display: flex; }
        .pw-arch-placeholder { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 18px; }
        .pw-node { border: 1.5px solid; border-radius: 9px; padding: 9px 18px; font: 600 12px 'JetBrains Mono', monospace; }
        .pw-node-root { border-color: #d8d8d8; color: #eaeaea; font-size: 13px; padding: 9px 20px; }
        .pw-node-active { border-color: #b8e832; color: #b8e832; }
        .pw-node-secondary { border-color: #6a6a72; color: #a9a9b1; }
        .pw-connector { width: 1px; height: 20px; background: #3a3a40; }
        .pw-row { display: flex; gap: 20px; }
        .pw-arch-footer { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); font: 400 10px 'JetBrains Mono', monospace; color: #5f5f66; white-space: nowrap; }

        .pw-pane-demo {
          position: relative;
          background: #0e0e11;
          background-image: repeating-linear-gradient(45deg, #131317 0 11px, #0e0e11 11px 22px);
          display: flex;
          align-items: flex-end;
          padding: 22px;
        }
        .pw-pane-demo .msg { font: 500 12px/1.5 'JetBrains Mono', monospace; color: #6c6c74; }
        .pw-pane-demo iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; display: block; }
        .pw-demo-embed { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 18px; }
        .pw-demo-embed .canicas-demo,
        .pw-demo-embed .musical-demo { height: 100%; max-height: 100%; width: auto; }
      `}</style>

      <div className="pw-tabs">
        {PROJECTS.map((p) => (
          <div
            key={p.id}
            className={`pw-tab${selected === p.id ? ' active' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            <span className="repo">{p.name}</span>
            <span className="subtitle">{p.subtitle}</span>
          </div>
        ))}
        <div className="pw-tabs-trail">
          <span className="note">Mismo formato siempre — cambiá sin reaprender.</span>
          <a href={active.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </div>

      <div className="pw-split">
        <div className="pw-pane-arch">
          <span className="pw-pane-label">Explorador de arquitectura</span>
          {selected === 'canicas' ? (
            <div className="pw-arch-inner">
              <FlowDiagramExplorer levels={canicasDiagrams} flow={canicasFlow} compact />
            </div>
          ) : (
            <>
              <div className="pw-arch-inner">
                <div className="pw-arch-placeholder">
                  {selected === 'rapier' ? (
                    <>
                      <div className="pw-node pw-node-root">lib.rs — engine root</div>
                      <div className="pw-connector" />
                      <div className="pw-row">
                        <div className="pw-node pw-node-active">physics_step ↳</div>
                        <div className="pw-node pw-node-secondary">colliders</div>
                        <div className="pw-node pw-node-secondary">bevy_plugin</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="pw-node pw-node-root">main.rs</div>
                      <div className="pw-connector" />
                      <div className="pw-row">
                        <div className="pw-node pw-node-active">setup ↳</div>
                        <div className="pw-node pw-node-secondary">systems</div>
                        <div className="pw-node pw-node-secondary">assets</div>
                      </div>
                      <div className="pw-connector" />
                      <div className="pw-row">
                        <div className="pw-node pw-node-secondary">physics_update</div>
                        <div className="pw-node pw-node-secondary">render</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <span className="pw-arch-footer">clic en un nodo para navegar el flujo del código →</span>
            </>
          )}
        </div>

        <div className="pw-pane-demo">
          <span className="pw-pane-label">Demo físico</span>
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
        </div>
      </div>
    </div>
  );
}
