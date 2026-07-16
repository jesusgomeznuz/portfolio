// El explorador de código, capa viewer: la experiencia del cmd+click.
// Alimentado SOLO por el parser (flow-viewer.generated.json) + el criterio
// del overlay (niveles, devOnly, hidden). Los nombres del código son el
// contenido — aquí no se redacta nada.
import { useMemo, useState } from 'react';

interface FlowNode {
  id: string;
  name: string;
  level: number;
  phase: string | null;
  kind: 'mode' | 'phase' | 'branch' | 'group' | 'helper' | 'system' | 'resource' | 'engine';
  file: string;
  line: number | null;
  target?: string;
  ritmo?: string;
  pisos?: number;
}

interface Criterio {
  nivel?: number;
  devOnly?: boolean;
  hidden?: boolean;
  media?: string;
}

type View =
  | { kind: 'main' }
  | { kind: 'root' }
  | { kind: 'phase'; name: string }
  | { kind: 'file'; file: string };

const KIND_COLORS: Record<FlowNode['kind'], string> = {
  mode: '#e5e5e5',
  phase: '#4ade80',
  branch: '#fb923c',
  group: '#c084fc',
  system: '#4fc3f7',
  resource: '#2dd4bf',
  helper: '#a1a1aa',
  engine: '#f472b6',
};

const KIND_LABELS: Array<[FlowNode['kind'], string]> = [
  ['phase', 'fase'],
  ['group', 'llamada gorda'],
  ['system', 'system'],
  ['resource', 'resource'],
  ['branch', 'rama'],
  ['helper', 'helper'],
  ['engine', 'engine'],
];

interface FlowData {
  nodes: FlowNode[];
}

export default function FlowViewer({ generated, overlay }: { generated: FlowData; overlay: Record<string, Criterio> }) {
  const criterioOf = (id: string): Criterio => overlay[id] ?? {};
  const nodes = useMemo(
    () =>
      (generated.nodes as FlowNode[])
        .filter((node) => !criterioOf(node.id).hidden)
        .map((node) => ({ ...node, level: criterioOf(node.id).nivel ?? node.level })),
    [],
  );
  const [stack, setStack] = useState<View[]>([{ kind: 'main' }]);
  const view = stack[stack.length - 1];

  const enter = (next: View) => setStack((current) => [...current, next]);
  const backTo = (index: number) => setStack((current) => current.slice(0, index + 1));

  const phases = nodes.filter((node) => node.level === 1 && node.kind === 'phase' && !node.phase);
  const runHelpers = nodes.filter((node) => node.level === 1 && node.kind === 'helper');
  const branchesOf = (phase: string) =>
    nodes.filter(
      (node) => node.level === 1 && node.phase === phase && (node.kind === 'branch' || node.kind === 'group'),
    );
  const systemsOf = (phase: string) =>
    nodes.filter((node) => node.level === 2 && node.phase === phase);
  const nodesInFile = (file: string) => nodes.filter((node) => node.file === file);

  const modes = nodes.filter((node) => node.kind === 'mode');

  const crumbLabel = (item: View): string => {
    if (item.kind === 'main') return 'main.rs';
    if (item.kind === 'root') return 'game/game.rs';
    if (item.kind === 'phase') return `${item.name}()`;
    return item.file.replace('src/', '');
  };

  const enterMode = (mode: FlowNode) => {
    if (mode.target?.startsWith('game')) enter({ kind: 'root' });
    else if (mode.target) enter({ kind: 'phase', name: mode.target.split('::')[0] });
  };

  return (
    <div className="fv-root">
      <style>{`
        .fv-root {
          height: 100%;
          display: flex;
          flex-direction: column;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          color: #ececec;
        }
        .fv-crumbs {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px 4px;
          font-size: 12px;
          flex-shrink: 0;
        }
        .fv-crumb {
          background: none;
          border: none;
          color: #9a9aa2;
          font: inherit;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
        }
        .fv-crumb:hover { color: #ececec; background: #1a1a1e; }
        .fv-crumb.current { color: #b8e832; cursor: default; }
        .fv-crumb.current:hover { background: none; }
        .fv-sep { color: #4a4a52; }
        .fv-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          padding: 0 4px 8px;
          font-size: 9.5px;
          color: #8a8a92;
          flex-shrink: 0;
        }
        .fv-legend-item { display: inline-flex; align-items: center; gap: 5px; }
        .fv-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .fv-canvas {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 8px 4px 24px;
        }
        .fv-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .fv-node {
          width: 100%;
          max-width: 340px;
          background: none;
          border: 1.5px solid var(--kind-color);
          color: var(--kind-color);
          border-radius: 9px;
          padding: 9px 14px;
          font: inherit;
          font-size: 12.5px;
          text-align: center;
          cursor: pointer;
          transition: background 0.12s;
        }
        .fv-node:hover { background: rgba(255, 255, 255, 0.06); }
        .fv-node.static { cursor: default; }
        .fv-node.static:hover { background: none; }
        .fv-node .fv-meta {
          display: block;
          margin-top: 3px;
          font-size: 10px;
          color: #6f6f78;
        }
        .fv-arrow {
          width: 1px;
          height: 18px;
          background: #3a3a40;
          flex-shrink: 0;
        }
        .fv-section {
          margin: 22px 0 8px;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #6f6f78;
          align-self: center;
        }
        .fv-badge {
          display: inline-block;
          margin-left: 6px;
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 9px;
          border: 1px solid #4a4a52;
          color: #8a8a92;
          vertical-align: middle;
        }
        .fv-branch-label {
          font-size: 10.5px;
          color: #fb923c;
          margin: 4px 0;
        }
      `}</style>

      <nav className="fv-crumbs">
        {stack.map((item, index) => (
          <span key={index} style={{ display: 'contents' }}>
            {index > 0 && <span className="fv-sep">›</span>}
            <button
              className={`fv-crumb${index === stack.length - 1 ? ' current' : ''}`}
              onClick={() => backTo(index)}
            >
              {crumbLabel(item)}
            </button>
          </span>
        ))}
      </nav>

      <div className="fv-legend">
        {KIND_LABELS.map(([kind, label]) => (
          <span key={kind} className="fv-legend-item">
            <span className="fv-dot" style={{ background: KIND_COLORS[kind] }} />
            {label}
          </span>
        ))}
      </div>

      <div className="fv-canvas">
        {view.kind === 'main' && (
          <div className="fv-column">
            <div
              className="fv-node static"
              style={{ '--kind-color': '#2dd4bf' } as React.CSSProperties}
            >
              args::parse_command()
            </div>
            <span className="fv-arrow" />
            <div className="fv-section" style={{ margin: '4px 0 8px' }}>match command</div>
            {modes.map((mode) => (
              <button
                key={mode.id}
                className={`fv-node${mode.target?.startsWith('game') ? '' : ' static'}`}
                style={{
                  '--kind-color': mode.target?.startsWith('game') ? '#4fc3f7' : KIND_COLORS.mode,
                  marginBottom: 10,
                } as React.CSSProperties}
                onClick={() => enterMode(mode)}
              >
                {mode.name}
                <span className="fv-meta">→ {mode.target}()</span>
              </button>
            ))}
          </div>
        )}

        {view.kind === 'root' && (
          <div className="fv-column">
            {nodes.filter((node) => node.kind === 'engine').map((engine) => (
              <span key={engine.id} style={{ display: 'contents' }}>
                <button
                  className="fv-node"
                  style={{ '--kind-color': KIND_COLORS.engine } as React.CSSProperties}
                  onClick={() => enter({ kind: 'phase', name: engine.name })}
                >
                  rapier_bevy::{engine.name}()
                  <span className="fv-meta">{engine.file}:{engine.line} — el engine arma la mesa</span>
                </button>
                <span className="fv-arrow" />
              </span>
            ))}
            {phases.map((phase, index) => (
              <span key={phase.id} style={{ display: 'contents' }}>
                {index > 0 && <span className="fv-arrow" />}
                <button
                  className="fv-node"
                  style={{ '--kind-color': KIND_COLORS.phase } as React.CSSProperties}
                  onClick={() => enter({ kind: 'phase', name: phase.name })}
                >
                  {phase.name}()
                </button>
              </span>
            ))}
            {runHelpers.length > 0 && <div className="fv-section">helpers de run()</div>}
            {runHelpers.map((helper) => (
              <button
                key={helper.id}
                className="fv-node"
                style={{ '--kind-color': KIND_COLORS.helper, marginTop: 6 } as React.CSSProperties}
                onClick={() => enter({ kind: 'file', file: helper.file })}
              >
                {helper.name}()
                <span className="fv-meta">{helper.file.replace('src/', '')}:{helper.line}</span>
              </button>
            ))}
          </div>
        )}

        {view.kind === 'phase' && (
          <div className="fv-column">
            {systemsOf(view.name).map((node, index) => (
              <span key={node.id} style={{ display: 'contents' }}>
                {index > 0 && <span className="fv-arrow" />}
                <button
                  className={`fv-node${node.kind === 'branch' ? ' static' : ''}`}
                  style={{ '--kind-color': KIND_COLORS[node.kind] } as React.CSSProperties}
                  onClick={() => {
                    if (node.kind === 'branch') return;
                    if (node.kind === 'group') enter({ kind: 'phase', name: node.name });
                    else enter({ kind: 'file', file: node.file });
                  }}
                >
                  {node.kind === 'group'
                    ? `${node.name}()`
                    : node.kind === 'branch'
                      ? node.name
                      : node.id.replace(/^(game|production)::/, '')}
                  {node.ritmo && <span className="fv-badge">{node.ritmo}</span>}
                  {criterioOf(node.id).devOnly && <span className="fv-badge">solo dev</span>}
                  <span className="fv-meta">{node.file.replace('src/', '')}:{node.line}</span>
                </button>
              </span>
            ))}
            {branchesOf(view.name).map((branch) => (
              <span key={branch.id} style={{ display: 'contents' }}>
                <span className="fv-arrow" />
                {branch.kind === 'branch' && <div className="fv-branch-label">rama:</div>}
                <button
                  className="fv-node"
                  style={{ '--kind-color': KIND_COLORS[branch.kind] } as React.CSSProperties}
                  onClick={() => enter({ kind: 'phase', name: branch.name })}
                >
                  {branch.name}()
                </button>
              </span>
            ))}
          </div>
        )}

        {view.kind === 'file' && (
          <div className="fv-column">
            {nodesInFile(view.file)
              .sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
              .map((node, index) => (
                <span key={node.id} style={{ display: 'contents' }}>
                  {index > 0 && <span className="fv-arrow" />}
                  <div
                    className="fv-node static"
                    style={{ '--kind-color': KIND_COLORS[node.kind] } as React.CSSProperties}
                  >
                    {node.name}()
                    {node.kind !== 'helper' && <span className="fv-badge">{node.kind}</span>}
                    <span className="fv-meta">línea {node.line}</span>
                  </div>
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
