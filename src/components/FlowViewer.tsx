// El explorador de código, capa viewer: la experiencia del cmd+click.
// Alimentado SOLO por el parser (flow-viewer.generated.json) + el criterio
// del overlay (niveles, devOnly, hidden). Los nombres del código son el
// contenido — aquí no se redacta nada.
//
// El color dice DE QUÉ SE ENCARGA (el departamento, o sea la carpeta: world,
// race, scene…). El relleno + chevron dicen SI TE LLEVA A ALGÚN LADO. Son dos
// canales separados a propósito: cuando el color cargaba las dos cosas hacía
// falta una leyenda de siete y se leía como tarea.
import { useMemo, useState } from 'react';

interface FlowNode {
  id: string;
  name: string;
  level: number;
  phase: string | null;
  kind: 'mode' | 'phase' | 'branch' | 'group' | 'helper' | 'system' | 'resource' | 'engine';
  dept: string | null;
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

/// El departamento es la carpeta; 'spine' es lo que no pertenece a ninguna
/// (main.rs, args.rs, la portada game.rs) porque su oficio es repartir.
const deptKey = (dept: string | null) => dept ?? 'spine';
const deptColor = (dept: string | null) => `var(--d-${deptKey(dept)}, var(--line2))`;

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
    [generated, overlay],
  );
  const [stack, setStack] = useState<View[]>([{ kind: 'main' }]);
  const view = stack[stack.length - 1];

  const enter = (next: View) => setStack((current) => [...current, next]);
  const backTo = (index: number) => setStack((current) => current.slice(0, index + 1));

  const phases = nodes.filter((node) => node.level === 1 && node.kind === 'phase' && !node.phase);
  const runHelpers = nodes.filter((node) => node.level === 1 && node.kind === 'helper');
  const engines = nodes.filter((node) => node.kind === 'engine');
  const modes = nodes.filter((node) => node.kind === 'mode');
  const gate = nodes.find((node) => node.id === 'args::parse_command');
  const branchesOf = (phase: string) =>
    nodes.filter(
      (node) => node.level === 1 && node.phase === phase && (node.kind === 'branch' || node.kind === 'group'),
    );
  const systemsOf = (phase: string) => nodes.filter((node) => node.level === 2 && node.phase === phase);
  const nodesInFile = (file: string) => nodes.filter((node) => node.file === file);
  /// Un chevron promete que hay algo más adentro. Si el archivo destino no
  /// tiene más que este mismo nodo, la promesa sería falsa: no se ofrece.
  const fileHasMore = (node: FlowNode) =>
    nodes.some((other) => other.file === node.file && other.id !== node.id);

  // Los chips de arriba salen de lo que hay EN ESTA VISTA — nunca los diez.
  const inView = (): FlowNode[] => {
    if (view.kind === 'main') return gate ? [gate, ...modes] : modes;
    if (view.kind === 'root') return [...engines, ...phases, ...runHelpers];
    if (view.kind === 'phase') return [...systemsOf(view.name), ...branchesOf(view.name)];
    return nodesInFile(view.file);
  };
  // 'spine' no se anuncia: es la ausencia de departamento, y anunciar una
  // ausencia es ruido. Los departamentos de verdad sí se nombran.
  const depts = [...new Set(inView().map((node) => deptKey(node.dept)))].filter((d) => d !== 'spine');
  // Pocas cajas → cajas grandes. El espacio del panel es fijo; que una vista de
  // tres nodos se vea igual de apretada que una de nueve desperdicia la mitad.
  const density = inView().length <= 4 ? 'roomy' : inView().length <= 7 ? 'mid' : 'dense';

  const crumbLabel = (item: View): string => {
    if (item.kind === 'main') return 'main.rs';
    if (item.kind === 'root') return 'game.rs';
    if (item.kind === 'phase') return item.name;
    return item.file.replace('src/', '');
  };

  const enterMode = (mode: FlowNode) => {
    if (mode.target?.startsWith('game')) enter({ kind: 'root' });
    else if (mode.target) enter({ kind: 'phase', name: mode.target.split('::')[0] });
  };

  /// Un nodo: barra de color al canto (el departamento), nombre en Futura,
  /// identificador en mono. Relleno + chevron solo si lleva a otra vista.
  const Node = ({
    node,
    sub,
    onGo,
    badge,
  }: {
    node: FlowNode;
    sub?: string;
    onGo?: () => void;
    badge?: string;
  }) => (
    <button
      className={`fv-node${onGo ? ' go' : ''}`}
      style={{ '--nc': deptColor(node.dept) } as React.CSSProperties}
      onClick={onGo}
      disabled={!onGo}
    >
      <span className="fv-name">
        {node.name}
        {badge && <span className="fv-badge">{badge}</span>}
      </span>
      {sub && <span className="fv-sub">{sub}</span>}
      {onGo && <span className="fv-chev">›</span>}
    </button>
  );

  const Stem = () => <span className="fv-stem" aria-hidden="true" />;

  return (
    <div className="fv-root">
      <style>{`
        .fv-root { height: 100%; display: flex; flex-direction: column; }

        .fv-head { flex-shrink: 0; }
        .fv-crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font: 500 11px/1.5 ui-monospace, Menlo, monospace; }
        .fv-crumb { background: none; border: none; color: var(--muted); font: inherit; cursor: pointer; padding: 0; }
        .fv-crumb:hover { color: var(--fg); }
        .fv-crumb.current { color: var(--fg); cursor: default; font-weight: 700; }
        .fv-sep { color: var(--dash); }

        .fv-depts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
        .fv-dept {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1px solid var(--ghost); border-radius: 999px; padding: 4px 10px 4px 7px;
          font: 600 8.5px/1 Futura, Jost, sans-serif; letter-spacing: .08em; text-transform: uppercase;
          color: var(--muted);
        }
        .fv-dept i { width: 9px; height: 3px; border-radius: 2px; display: block; background: var(--dc); }

        .fv-canvas { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; justify-content: center; padding: 18px 0 4px; }
        .fv-col { display: flex; flex-direction: column; }
        .fv-pair { display: flex; gap: 14px; }
        .fv-pair .fv-node { flex: 1; min-width: 0; }

        .fv-node {
          display: block; width: 100%; text-align: left; position: relative; overflow: hidden;
          border: 1.4px solid var(--line2); border-radius: 9px; background: transparent;
          padding: 10px 12px 10px 16px; font-family: inherit; cursor: default;
          transition: background .14s, transform .14s;
        }
        .fv-node::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--nc); }
        .fv-node:disabled { opacity: .7; }
        .fv-node.go { cursor: pointer; background: var(--band); }
        .fv-node.go:hover { background: color-mix(in srgb, var(--nc) 22%, var(--band)); transform: translateY(-1px); }

        .fv-name { display: block; font: 700 13px/1.25 Futura, Jost, sans-serif; color: var(--fg); padding-right: 14px; word-break: break-word; }
        .fv-node:disabled .fv-name { font-weight: 500; }
        .fv-sub { display: block; margin-top: 3px; font: 400 9.5px/1.35 ui-monospace, Menlo, monospace; color: var(--muted); word-break: break-all; }
        .fv-chev { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--nc); font-size: 16px; line-height: 1; }

        /* Densidad: la caja crece cuando hay lugar, para que invite en vez de
           flotar perdida en un panel medio vacío. */
        .fv-canvas.roomy .fv-node { padding: 18px 14px 18px 20px; }
        .fv-canvas.roomy .fv-name { font-size: 16px; }
        .fv-canvas.roomy .fv-sub { font-size: 10.5px; margin-top: 5px; }
        .fv-canvas.roomy .fv-node::before { width: 5px; }
        .fv-canvas.roomy .fv-chev { font-size: 19px; right: 13px; }
        .fv-canvas.roomy .fv-stem { height: 20px; }
        .fv-canvas.mid .fv-node { padding: 13px 12px 13px 17px; }
        .fv-canvas.mid .fv-name { font-size: 14px; }

        .fv-badge {
          display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 999px;
          font: 500 8.5px/1.5 Futura, Jost, sans-serif; letter-spacing: .05em;
          border: 1px solid var(--ghost); color: var(--muted); vertical-align: middle;
        }

        .fv-stem { display: block; width: 1.4px; height: 14px; margin-left: 22px; background: var(--line2); flex-shrink: 0; }
        .fv-fork { display: block; width: 100%; height: 24px; flex-shrink: 0; }
        .fv-section { margin: 18px 0 8px; font: 600 8.5px/1 Futura, Jost, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
      `}</style>

      <div className="fv-head">
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
        <div className="fv-depts">
          {depts.map((dept) => (
            <span key={dept} className="fv-dept" style={{ '--dc': `var(--d-${dept}, var(--line2))` } as React.CSSProperties}>
              <i />
              {dept.replaceAll('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      <div className={`fv-canvas ${density}`}>
        {view.kind === 'main' && (
          <div className="fv-col">
            {gate && (
              <Node
                node={gate}
                sub={`${gate.file.replace('src/', '')}:${gate.line}`}
                onGo={fileHasMore(gate) ? () => enter({ kind: 'file', file: gate.file }) : undefined}
              />
            )}
            {/* El match de main.rs SÍ se abre: dos brazos lado a lado, no una lista */}
            <svg className="fv-fork" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
              <path d="M150,0 L150,12 L72,12 L72,24" fill="none" stroke="var(--line2)" strokeWidth="1.4" />
              <path d="M150,0 L150,12 L228,12 L228,24" fill="none" stroke="var(--line2)" strokeWidth="1.4" />
            </svg>
            <div className="fv-pair">
              {modes.map((mode) => (
                <Node
                  key={mode.id}
                  node={mode}
                  sub={mode.target ? `${mode.target}()` : undefined}
                  onGo={mode.target?.startsWith('game') ? () => enterMode(mode) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {view.kind === 'root' && (
          <div className="fv-col">
            {engines.map((engine) => (
              <span key={engine.id} style={{ display: 'contents' }}>
                <Node
                  node={engine}
                  sub="el engine arma la mesa"
                  onGo={() => enter({ kind: 'phase', name: engine.name })}
                />
                <Stem />
              </span>
            ))}
            {phases.map((phase, index) => (
              <span key={phase.id} style={{ display: 'contents' }}>
                {index > 0 && <Stem />}
                <Node node={phase} onGo={() => enter({ kind: 'phase', name: phase.name })} />
              </span>
            ))}
            {runHelpers.length > 0 && <div className="fv-section">helpers de run()</div>}
            {runHelpers.map((helper, index) => (
              <span key={helper.id} style={{ display: 'contents' }}>
                {index > 0 && <Stem />}
                <Node
                  node={helper}
                  sub={`${helper.file.replace('src/', '')}:${helper.line}`}
                  onGo={fileHasMore(helper) ? () => enter({ kind: 'file', file: helper.file }) : undefined}
                />
              </span>
            ))}
          </div>
        )}

        {view.kind === 'phase' && (
          <div className="fv-col">
            {systemsOf(view.name).map((node, index) => (
              <span key={node.id} style={{ display: 'contents' }}>
                {index > 0 && <Stem />}
                <Node
                  node={node}
                  sub={`${node.file.replace('src/', '')}${node.line ? `:${node.line}` : ''}`}
                  badge={node.ritmo ?? (criterioOf(node.id).devOnly ? 'solo dev' : undefined)}
                  onGo={
                    node.kind === 'branch'
                      ? undefined
                      : node.kind === 'group'
                        ? () => enter({ kind: 'phase', name: node.name })
                        : fileHasMore(node)
                          ? () => enter({ kind: 'file', file: node.file })
                          : undefined
                  }
                />
              </span>
            ))}
            {branchesOf(view.name).map((branch) => (
              <span key={branch.id} style={{ display: 'contents' }}>
                <Stem />
                <Node node={branch} onGo={() => enter({ kind: 'phase', name: branch.name })} />
              </span>
            ))}
          </div>
        )}

        {view.kind === 'file' && (
          <div className="fv-col">
            {nodesInFile(view.file)
              .sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
              .map((node, index) => (
                <span key={node.id} style={{ display: 'contents' }}>
                  {index > 0 && <Stem />}
                  <Node node={node} sub={`línea ${node.line}`} />
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
