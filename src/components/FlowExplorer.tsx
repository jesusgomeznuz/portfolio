import { useMemo, useState } from 'react';
import type { RepoFlow } from '../data/flow-tree';

interface Props {
  flow: RepoFlow;
}

export default function FlowExplorer({ flow }: Props) {
  const { nodes, repoSlug, githubUser } = flow;
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const rootId = nodes.find((n) => n.parent === null)!.id;

  const [currentId, setCurrentId] = useState(rootId);
  const [history, setHistory] = useState<string[]>([]);

  const current = byId[currentId];
  const children = nodes.filter((n) => n.parent === currentId).sort((a, b) => a.order - b.order);

  const breadcrumb: string[] = [];
  let walk: string | null = currentId;
  while (walk) {
    breadcrumb.unshift(walk);
    walk = byId[walk].parent;
  }

  function goTo(id: string) {
    setHistory((h) => [...h, currentId]);
    setCurrentId(id);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = [...h];
      const last = next.pop()!;
      setCurrentId(last);
      return next;
    });
  }

  function goToBreadcrumb(id: string) {
    const idx = breadcrumb.indexOf(id);
    setHistory(breadcrumb.slice(0, idx));
    setCurrentId(id);
  }

  const githubUrl = `https://github.com/${githubUser}/${repoSlug}/blob/main/${current.file}`;

  return (
    <div className="flow-explorer">
      <style>{`
        .flow-explorer {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 20px 24px 24px;
          font-family: var(--font);
        }
        .flow-explorer .fe-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .flow-explorer .fe-back {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--muted-bright);
          border-radius: 6px;
          font-size: 12px;
          padding: 4px 10px;
          cursor: pointer;
          font-family: var(--font);
        }
        .flow-explorer .fe-back:disabled { opacity: 0.35; cursor: default; }
        .flow-explorer .fe-back:not(:disabled):hover { border-color: var(--border-hover); color: var(--text); }
        .flow-explorer .fe-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--muted);
          flex-wrap: wrap;
        }
        .flow-explorer .fe-breadcrumb button {
          background: none;
          border: none;
          color: var(--muted-bright);
          cursor: pointer;
          font-size: 12px;
          font-family: var(--font);
          padding: 0;
        }
        .flow-explorer .fe-breadcrumb button:hover { color: var(--accent); }
        .flow-explorer .fe-breadcrumb .fe-current { color: var(--text); font-weight: 600; }
        .flow-explorer .fe-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px 18px;
        }
        .flow-explorer .fe-file {
          font-family: ui-monospace, 'SF Mono', monospace;
          font-size: 12px;
          color: var(--accent);
          margin-bottom: 8px;
        }
        .flow-explorer .fe-description {
          color: var(--muted-bright);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 14px;
        }
        .flow-explorer .fe-signatures {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 14px;
        }
        .flow-explorer .fe-signatures code {
          display: block;
          font-family: ui-monospace, 'SF Mono', monospace;
          font-size: 12px;
          color: var(--muted-bright);
          line-height: 1.9;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .flow-explorer .fe-github {
          display: inline-block;
          font-size: 12px;
          font-weight: 500;
          color: var(--muted-bright);
          text-decoration: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 5px 12px;
          transition: border-color 0.2s, color 0.2s;
        }
        .flow-explorer .fe-github:hover { border-color: var(--accent); color: var(--accent); }
        .flow-explorer .fe-children {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        .flow-explorer .fe-child {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          text-align: left;
          cursor: pointer;
          font-family: var(--font);
          transition: border-color 0.2s, background 0.2s;
        }
        .flow-explorer .fe-child:hover { border-color: var(--accent); background: var(--surface-hover); }
        .flow-explorer .fe-child .fe-child-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          display: block;
          margin-bottom: 4px;
        }
        .flow-explorer .fe-child .fe-child-desc {
          font-size: 11px;
          color: var(--muted);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .flow-explorer .fe-leaf-note {
          font-size: 12px;
          color: var(--muted);
          margin-top: 16px;
          font-style: italic;
        }
      `}</style>

      <div className="fe-toolbar">
        <button className="fe-back" onClick={goBack} disabled={history.length === 0}>
          ← atrás
        </button>
        <div className="fe-breadcrumb">
          {breadcrumb.map((id, i) => (
            <span key={id}>
              {i > 0 && <span> / </span>}
              {id === currentId ? (
                <span className="fe-current">{byId[id].label}</span>
              ) : (
                <button onClick={() => goToBreadcrumb(id)}>{byId[id].label}</button>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="fe-card">
        <div className="fe-file">{current.file}</div>
        <p className="fe-description">{current.description}</p>
        <div className="fe-signatures">
          {current.signatures.map((sig) => (
            <code key={sig}>{sig}</code>
          ))}
        </div>
        <a className="fe-github" href={githubUrl} target="_blank" rel="noreferrer">
          Ver en GitHub →
        </a>
      </div>

      {children.length > 0 ? (
        <div className="fe-children">
          {children.map((child) => (
            <button key={child.id} className="fe-child" onClick={() => goTo(child.id)}>
              <span className="fe-child-label">{child.label}</span>
              <span className="fe-child-desc">{child.description}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="fe-leaf-note">Archivo hoja — sin más subflujos.</p>
      )}
    </div>
  );
}
