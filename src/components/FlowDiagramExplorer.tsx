import { useEffect, useMemo, useRef, useState } from 'react';
import type { DiagramLevel } from '../data/flow-diagrams';
import type { RepoFlow } from '../data/flow-tree';

interface Props {
  levels: DiagramLevel[];
  flow: RepoFlow;
  compact?: boolean;
}

type View = { kind: 'diagram'; id: string } | { kind: 'file'; id: string };

export default function FlowDiagramExplorer({ levels, flow, compact = false }: Props) {
  const levelById = useMemo(() => Object.fromEntries(levels.map((l) => [l.id, l])), [levels]);
  const fileById = useMemo(() => Object.fromEntries(flow.nodes.map((n) => [n.id, n])), [flow.nodes]);

  const [view, setView] = useState<View>({ kind: 'diagram', id: levels[0].id });
  const [history, setHistory] = useState<View[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<any>(null);

  function navigate(next: View) {
    setHistory((h) => [...h, view]);
    setView(next);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const copy = [...h];
      const prev = copy.pop()!;
      setView(prev);
      return copy;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (view.kind !== 'diagram') return;
      const level = levelById[view.id];
      if (!level || !containerRef.current) return;

      if (!mermaidRef.current) {
        const mod = await import('mermaid');
        mermaidRef.current = mod.default;
        mermaidRef.current.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'base',
          look: 'handDrawn',
          themeVariables: {
            background: '#0c0c0e',
            primaryColor: 'transparent',
            primaryTextColor: '#ececec',
            primaryBorderColor: '#e5e5e5',
            lineColor: '#e5e5e5',
            secondaryColor: 'transparent',
            tertiaryColor: 'transparent',
            fontFamily: "'Permanent Marker', cursive",
          },
        });
      }

      const mermaid = mermaidRef.current;
      const renderId = `mermaid-${level.id}-${Date.now()}`;
      const { svg } = await mermaid.render(renderId, level.mermaid);
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = svg;

      const nodeIdPattern = /-flowchart-(.+)-\d+$/;
      const allNodes = containerRef.current.querySelectorAll('[id*="-flowchart-"]');
      allNodes.forEach((el) => {
        const match = el.id.match(nodeIdPattern);
        if (!match) return;
        const link = level.links[match[1]];
        if (!link) return;
        const target = el as HTMLElement;
        target.style.cursor = 'pointer';
        target.addEventListener('click', () => {
          if (link.type === 'diagram') navigate({ kind: 'diagram', id: link.target });
          else navigate({ kind: 'file', id: link.target });
        });
        target.addEventListener('mouseenter', () => target.style.setProperty('opacity', '0.75'));
        target.addEventListener('mouseleave', () => target.style.setProperty('opacity', '1'));
      });

      fitDiagramToContainer();
    }

    // Small diagrams (e.g. main.rs) render far smaller than the panel and sit
    // stuck in the top-left corner. Scale them up to fill the space when they
    // fit; leave bigger diagrams (e.g. run_sim) at natural size with scroll —
    // shrinking those would make the node labels unreadable.
    function fitDiagramToContainer() {
      if (!containerRef.current) return;
      const svg = containerRef.current.querySelector('svg') as SVGSVGElement | null;
      if (!svg) return;
      const svgWidth = svg.width.baseVal.value || svg.viewBox.baseVal.width;
      const svgHeight = svg.height.baseVal.value || svg.viewBox.baseVal.height;
      if (!svgWidth || !svgHeight) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scale = Math.min(rect.width / svgWidth, rect.height / svgHeight, 2.2);

      if (scale > 1.02) {
        svg.style.transform = `scale(${scale})`;
        svg.style.transformOrigin = 'center';
        containerRef.current.style.display = 'flex';
        containerRef.current.style.alignItems = 'center';
        containerRef.current.style.justifyContent = 'center';
      } else {
        svg.style.transform = '';
        containerRef.current.style.display = 'block';
      }
    }

    render();

    const resizeObserver = new ResizeObserver(() => fitDiagramToContainer());
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => {
      cancelled = true;
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const currentFile = view.kind === 'file' ? fileById[view.id] : null;
  const githubUrl = currentFile
    ? `https://github.com/${flow.githubUser}/${flow.repoSlug}/blob/main/${currentFile.file}`
    : null;

  return (
    <div className={`flow-diagram-explorer${compact ? ' fde-compact' : ''}`}>
      <style>{`
        .flow-diagram-explorer {
          --fde-bg: #0c0c0e;
          --fde-panel: #131316;
          --fde-border: #4fc3f7;
          --fde-border-soft: #333340;
          --fde-text: #ececec;
          --fde-muted: #9999a8;

          background: var(--fde-bg);
          border: 1px solid var(--fde-border-soft);
          border-radius: 10px;
          padding: 20px 24px 24px;
          font-family: 'Permanent Marker', cursive;
        }
        .flow-diagram-explorer.fde-compact {
          background: none;
          border: none;
          padding: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .flow-diagram-explorer.fde-compact .fde-title { font-size: 13px; }
        .flow-diagram-explorer.fde-compact .fde-back { font-size: 11px; padding: 3px 8px; }
        .flow-diagram-explorer.fde-compact .fde-hint { display: none; }
        .flow-diagram-explorer.fde-compact .fde-diagram {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        .flow-diagram-explorer .fde-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .flow-diagram-explorer .fde-back {
          background: transparent;
          border: 1px solid var(--fde-border-soft);
          color: var(--fde-muted);
          border-radius: 6px;
          font-size: 14px;
          padding: 4px 10px;
          cursor: pointer;
          font-family: 'Permanent Marker', cursive;
        }
        .flow-diagram-explorer .fde-back:disabled { opacity: 0.35; cursor: default; }
        .flow-diagram-explorer .fde-back:not(:disabled):hover { border-color: var(--fde-border); color: var(--fde-text); }
        .flow-diagram-explorer .fde-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--fde-text);
        }
        .flow-diagram-explorer .fde-hint {
          font-family: var(--font);
          font-size: 13px;
          color: var(--fde-muted);
          margin-bottom: 14px;
        }
        .flow-diagram-explorer .fde-diagram {
          overflow-x: auto;
        }
        .flow-diagram-explorer .fde-diagram svg { max-width: none; }
        .flow-diagram-explorer .fde-card {
          padding: 4px 0 0;
        }
        .flow-diagram-explorer .fde-file {
          font-family: ui-monospace, 'SF Mono', monospace;
          font-size: 12px;
          color: var(--fde-border);
          margin-bottom: 8px;
        }
        .flow-diagram-explorer .fde-description {
          font-family: var(--font);
          color: var(--fde-text);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 14px;
        }
        .flow-diagram-explorer .fde-signatures {
          background: var(--fde-bg);
          border: 1px solid var(--fde-border-soft);
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 14px;
        }
        .flow-diagram-explorer .fde-signatures code {
          display: block;
          font-family: ui-monospace, 'SF Mono', monospace;
          font-size: 12px;
          color: var(--fde-muted);
          line-height: 1.9;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .flow-diagram-explorer .fde-github {
          display: inline-block;
          font-size: 14px;
          font-weight: 500;
          color: var(--fde-muted);
          text-decoration: none;
          border: 1px solid var(--fde-border-soft);
          border-radius: 6px;
          padding: 5px 12px;
          transition: border-color 0.2s, color 0.2s;
          font-family: 'Permanent Marker', cursive;
        }
        .flow-diagram-explorer .fde-github:hover { border-color: var(--fde-border); color: var(--fde-border); }
      `}</style>

      <div className="fde-toolbar">
        <button className="fde-back" onClick={goBack} disabled={history.length === 0}>
          ← atrás
        </button>
        <span className="fde-title">
          {view.kind === 'diagram' ? levelById[view.id]?.title : currentFile?.label}
        </span>
      </div>

      {view.kind === 'diagram' ? (
        <>
          <p className="fde-hint">Los nodos resaltados son clickeables — te llevan a su propio flujo o archivo.</p>
          <div className="fde-diagram" ref={containerRef} />
        </>
      ) : (
        currentFile && (
          <div className="fde-card">
            <div className="fde-file">{currentFile.file}</div>
            <p className="fde-description">{currentFile.description}</p>
            <div className="fde-signatures">
              {currentFile.signatures.map((sig) => (
                <code key={sig}>{sig}</code>
              ))}
            </div>
            <a className="fde-github" href={githubUrl!} target="_blank" rel="noreferrer">
              Ver en GitHub →
            </a>
          </div>
        )
      )}
    </div>
  );
}
