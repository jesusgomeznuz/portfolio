// El explorador de código, capa viewer: la experiencia del cmd+click.
// Alimentado SOLO por el parser (flow-viewer.generated.json) + el criterio
// del overlay (niveles, devOnly, hidden). Los nombres del código son el
// contenido — aquí no se redacta nada.
//
// El color dice DE QUÉ SE ENCARGA (el departamento, o sea la carpeta: world,
// race, scene…). El relleno + chevron dicen SI TE LLEVA A ALGÚN LADO. Son dos
// canales separados a propósito: cuando el color cargaba las dos cosas hacía
// falta una leyenda de siete y se leía como tarea.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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

/// El patrón "hover card" (GitHub, Wikipedia, Notion): el preview se ancla al
/// ELEMENTO, no al cursor — el contenido habla del nodo entero, no del pixel
/// donde entraste, así que moverse con el mouse sugería una relación que no
/// existe. Seguir al cursor se reserva para espacio continuo (gráficas, mapas).
/// Los retardos son la otra mitad del patrón: sin ellos, pasar "de camino" a
/// otro nodo dispara el clip y se siente nervioso. Cortos a propósito — lo
/// justo para filtrar el paso de largo, no tanto como para tener que esperar.
const OPEN_DELAY_MS = 50;
const CLOSE_DELAY_MS = 80;

interface NodeProps {
  node: FlowNode;
  sub?: string;
  onGo?: () => void;
  badge?: string;
  media?: string;
  onShow: (src: string, anchor: HTMLElement, at: { x: number; y: number }) => void;
  onHide: () => void;
  onArm: (at: { x: number; y: number }) => void;
}

/// Un nodo: barra de color al canto (el departamento), nombre en Futura,
/// identificador en mono. Relleno + chevron solo si lleva a otra vista.
///
/// Vive FUERA de FlowViewer a propósito: definido adentro, cada render creaba
/// un TIPO de componente nuevo, así que React desmontaba y volvía a montar
/// todos los botones en cada cambio de estado — incluido el que dispara el
/// propio hover. El mouse quedaba sobre un DOM distinto al que registró el
/// onMouseLeave y el clip se quedaba abierto para siempre.
function Node({ node, sub, onGo, badge, media, onShow, onHide, onArm }: NodeProps) {
  return (
    <button
      className={`fv-node${onGo ? ' go' : ''}`}
      style={{ '--nc': deptColor(node.dept) } as React.CSSProperties}
      onClick={(event) => {
        onArm({ x: event.clientX, y: event.clientY });
        onGo?.();
      }}
      disabled={!onGo && !media}
      onMouseEnter={(event) => media && onShow(media, event.currentTarget, { x: event.clientX, y: event.clientY })}
      onMouseLeave={onHide}
      onFocus={(event) => media && onShow(media, event.currentTarget, { x: -1, y: -1 })}
      onBlur={onHide}
    >
      <span className="fv-name">
        {media && <span className="fv-hasclip" aria-label="tiene clip">▸</span>}
        {node.name}
        {badge && <span className="fv-badge">{badge}</span>}
      </span>
      {sub && <span className="fv-sub">{sub}</span>}
      {onGo && <span className="fv-chev">›</span>}
    </button>
  );
}

const Stem = () => <span className="fv-stem" aria-hidden="true" />;

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
  // El clip flota en position:fixed anclado al nodo. En el estado va solo el
  // src; la posición se escribe directo al DOM por ref, así recolocar (al
  // cargar el video, al hacer scroll) no re-renderiza el árbol de nodos.
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorEl = useRef<HTMLElement | null>(null);
  const openTimer = useRef<number>();
  const closeTimer = useRef<number>();
  /// Dónde estaba el cursor al navegar. Los nodos nuevos se dibujan debajo de
  /// un mouse quieto y el navegador dispara su hover solo: tú no apuntaste a
  /// nada, la vista se te acomodó encima. Mientras el puntero siga en ESE
  /// punto exacto, ese nodo se comporta como espacio vacío.
  const deadPoint = useRef<{ x: number; y: number } | null>(null);

  /// Horizontal SIEMPRE igual: pegado al borde del panel, no del nodo. Los
  /// nodos no miden lo mismo — los brazos del match de main.rs son de media
  /// anchura — así que anclarlo al nodo hacía que unos clips salieran fuera
  /// del flujo y otros encima de él. Vertical sí sigue al nodo: centrado sobre
  /// él y siempre dentro de pantalla.
  const place = () => {
    const el = previewRef.current;
    const anchor = anchorEl.current;
    const root = rootRef.current;
    if (!el || !anchor || !root) return;
    const gap = 14;
    const rect = anchor.getBoundingClientRect();
    const panel = root.getBoundingClientRect();
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    // Nunca a la izquierda: ahí vive el demo en la portada. Si el margen no
    // alcanza, se recorre lo mínimo para caber en pantalla en vez de saltar
    // al otro lado — la posición se mantiene reconocible.
    const left = Math.max(8, Math.min(panel.right + gap, window.innerWidth - width - 8));
    const top = Math.min(
      Math.max(8, rect.top + rect.height / 2 - height / 2),
      Math.max(8, window.innerHeight - height - 8),
    );
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };

  const showPreview = (src: string, anchor: HTMLElement, at: { x: number; y: number }) => {
    // El hover llegó sin que el cursor se moviera: no fuiste tú.
    if (deadPoint.current && at.x === deadPoint.current.x && at.y === deadPoint.current.y) return;
    deadPoint.current = null;
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      anchorEl.current = anchor;
      setPreviewSrc(src);
    }, OPEN_DELAY_MS);
  };
  const hidePreview = () => {
    deadPoint.current = null;
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setPreviewSrc(null), CLOSE_DELAY_MS);
  };
  /// Cerrar YA, sin el retardo de cortesía: al navegar el nodo se desmonta y su
  /// onMouseLeave nunca llega, así que esperar dejaría el clip huérfano.
  const dropPreview = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    setPreviewSrc(null);
  };
  // Al aparecer aún no tiene medidas: se coloca cuando ya existe en el DOM,
  // antes de pintar, para que no se vea saltar desde la esquina.
  useLayoutEffect(() => {
    if (previewSrc) place();
  }, [previewSrc]);
  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  // Navegar siempre cierra el clip: al cambiar de vista el nodo se desmonta y
  // su onMouseLeave nunca llega a dispararse, así que el preview se quedaba
  // abierto hasta que movieras el mouse.
  const enter = (next: View) => {
    dropPreview();
    setStack((current) => [...current, next]);
  };
  const backTo = (index: number) => {
    dropPreview();
    setStack((current) => current.slice(0, index + 1));
  };

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
  /// Un modo lleva a algún lado si su destino tiene contenido. Antes solo se
  /// abría el que apunta a `game::`, así que los conversores quedaban muertos
  /// sin serlo: BuildModules esconde tres pasos y WriteTimeline cinco — que en
  /// musical-path son justo los de la canción volviéndose mapa.
  const modeLeadsSomewhere = (mode: FlowNode) => {
    if (!mode.target) return false;
    if (mode.target.startsWith('game')) return true;
    const destino = mode.target.split('::')[0];
    return nodes.some((node) => node.phase === destino);
  };

  // Los tres props que todo nodo necesita para el clip, en un solo lugar.
  const clip = (id: string) => ({
    media: criterioOf(id).media,
    onShow: showPreview,
    onHide: hidePreview,
    onArm: (at: { x: number; y: number }) => {
      deadPoint.current = at;
    },
  });

  return (
    <div className="fv-root" ref={rootRef}>
      <style>{`
        .fv-root { height: 100%; display: flex; flex-direction: column; }

        .fv-head { flex-shrink: 0; }
        .fv-crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font: 500 11px/1.5 ui-monospace, Menlo, monospace; }
        /* Altura propia: no la fijan los tags, así que da igual si esa vista
           trae tres, uno o ninguno — el botón no se mueve. */
        .fv-topline { display: flex; align-items: center; gap: 12px; min-height: 44px; margin-top: 6px; }
        .fv-topline .fv-depts { margin-top: 0; flex: 1; min-width: 0; }
        .fv-back {
          flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 9px;
          padding: 9px 15px 9px 12px;
          border: 1.4px solid var(--line); border-radius: 999px;
          background: var(--band); color: var(--fg);
          font: 600 12.5px/1 ui-monospace, Menlo, monospace;
          cursor: pointer; transition: background .14s, color .14s, transform .14s;
        }
        .fv-back-arrow { font-size: 16px; line-height: 1; }
        .fv-back:hover { background: var(--line); color: var(--card); transform: translateX(-2px); }
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

        /* Un nodo con clip lo avisa con un solo carácter — si no se avisa,
           nadie descubre que hay algo que ver ahí. */
        .fv-hasclip { color: var(--nc); margin-right: 5px; font-size: .85em; }

        /* El clip manda su proporción: los del juego son verticales, los de una
           función podrían ser apaisados. Se limita por los dos lados para que
           ninguno se coma la pantalla. */
        .fv-preview {
          /* Arriba de 16777271: los nombres de las canicas son <Html> de
             @react-three/drei, que calcula su z-index desde la distancia a la
             cámara para ordenarlos en profundidad — llegan a ~16.4 millones.
             Con un z-index normal el clip quedaba DEBAJO de esos nombres. */
          position: fixed; z-index: 16777300; line-height: 0;
          border: 1.4px solid var(--line); border-radius: 10px; overflow: hidden;
          background: var(--card); box-shadow: 0 18px 50px rgba(0, 0, 0, .35);
          pointer-events: none;
        }
        .fv-preview video {
          display: block; max-width: 250px; max-height: 42vh;
          width: auto; height: auto;
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
                onClick={(event) => {
                  deadPoint.current = { x: event.clientX, y: event.clientY };
                  backTo(index);
                }}
              >
                {crumbLabel(item)}
              </button>
            </span>
          ))}
        </nav>
        {/* Los tags y el botón de volver comparten renglón: los tags a la
            izquierda, volver a la derecha. Debajo de los tags no servía —
            cuando una vista no trae tags el renglón se encoge y el botón se
            mueve. Aquí el renglón tiene altura propia y no depende de que
            haya tags, ni de cuántos nodos tenga la vista. */}
        <div className="fv-topline">
          <div className="fv-depts">
            {depts.map((dept) => (
              <span key={dept} className="fv-dept" style={{ '--dc': `var(--d-${dept}, var(--line2))` } as React.CSSProperties}>
                <i />
                {dept.replaceAll('_', ' ')}
              </span>
            ))}
          </div>
          {stack.length > 1 && (
            <button
              className="fv-back"
              onClick={(event) => {
                deadPoint.current = { x: event.clientX, y: event.clientY };
                backTo(stack.length - 2);
              }}
            >
              <span className="fv-back-arrow" aria-hidden="true">←</span>
              {crumbLabel(stack[stack.length - 2])}
            </button>
          )}
        </div>
      </div>

      {previewSrc && (
        <div className="fv-preview" ref={previewRef}>
          {/* Recolocar al saber su tamaño: en el primer frame el <video> aún no
              tiene dimensiones y se colocaría midiendo una caja de alto cero. */}
          <video
            key={previewSrc}
            src={previewSrc}
            autoPlay
            muted
            loop
            playsInline
            onLoadedMetadata={place}
          />
        </div>
      )}

      <div className={`fv-canvas ${density}`}>
        {view.kind === 'main' && (
          <div className="fv-col">
            {gate && (
              <Node
                node={gate}
                {...clip(gate.id)}
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
                  {...clip(mode.id)}
                  sub={mode.target ? `${mode.target}()` : undefined}
                  onGo={modeLeadsSomewhere(mode) ? () => enterMode(mode) : undefined}
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
                  {...clip(engine.id)}
                  sub="el engine arma la mesa"
                  onGo={() => enter({ kind: 'phase', name: engine.name })}
                />
                <Stem />
              </span>
            ))}
            {phases.map((phase, index) => (
              <span key={phase.id} style={{ display: 'contents' }}>
                {index > 0 && <Stem />}
                <Node node={phase} {...clip(phase.id)} onGo={() => enter({ kind: 'phase', name: phase.name })} />
              </span>
            ))}
            {runHelpers.length > 0 && <div className="fv-section">helpers de run()</div>}
            {runHelpers.map((helper, index) => (
              <span key={helper.id} style={{ display: 'contents' }}>
                {index > 0 && <Stem />}
                <Node
                  node={helper}
                  {...clip(helper.id)}
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
                  {...clip(node.id)}
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
                <Node node={branch} {...clip(branch.id)} onGo={() => enter({ kind: 'phase', name: branch.name })} />
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
                  <Node node={node} {...clip(node.id)} sub={`línea ${node.line}`} />
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
