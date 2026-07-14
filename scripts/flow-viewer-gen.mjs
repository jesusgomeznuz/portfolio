// El generador de la capa viewer: parsea la ESTRUCTURA del código de
// canicasbrawl-rapier — la convención de Peter es el metalenguaje:
//   N1 = las fases dentro de run() (simulation.rs)
//   N2 = los systems/resources registrados dentro de cada fase
//   N3 = los pub fn de cada archivo que no aparecen en simulation.rs (helpers)
// Emite src/data/flow-viewer.generated.json y valida el sidecar curado:
// una entrada del overlay que ya no existe en el código TRUENA (huérfano).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const GAME_REPO = path.resolve(process.cwd(), '../canicasbrawl-rapier');
const SIMULATION = path.join(GAME_REPO, 'src/simulation.rs');
const OUTPUT = path.resolve(process.cwd(), 'src/data/flow-viewer.generated.json');
const OVERLAY = path.resolve(process.cwd(), 'src/data/flow-viewer-overlay.json');

// ── N1: las fases — los cuerpos de fn dentro de simulation.rs ────────────────

function readSource(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/// Extrae cada `fn nombre(...) { cuerpo }` de un archivo Rust (a nivel de llaves).
function extractFunctions(source) {
  const functions = new Map();
  const regex = /(?:pub )?fn (\w+)\s*(?:<[^>]*>)?\s*\(/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    const name = match[1];
    const bodyStart = source.indexOf('{', regex.lastIndex);
    if (bodyStart === -1) continue;
    let depth = 0;
    let end = bodyStart;
    for (let i = bodyStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      if (source[i] === '}') depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
    const line = source.slice(0, match.index).split('\n').length;
    functions.set(name, { body: source.slice(bodyStart, end + 1), line });
  }
  return functions;
}

/// Los paths `game::...::fn` / `production::...::fn` dentro de un cuerpo,
/// clasificados: dentro de insert_resource(...) son recursos, el resto systems.
function extractReferences(body) {
  const references = [];
  const pathRegex = /(game|production)((?:::\w+)+)/g;
  let match;
  while ((match = pathRegex.exec(body)) !== null) {
    const full = match[0];
    const lastSegment = full.split('::').pop();
    const isType = /^[A-Z]/.test(lastSegment);
    const before = body.slice(Math.max(0, match.index - 60), match.index);
    const isResource = before.includes('insert_resource(');
    if (isType && !isResource) continue; // add_event::<Tipo> y similares: no son systems
    references.push({ path: full, kind: isResource ? 'resource' : 'system' });
  }
  return references;
}

/// `game::sensors::freeze::try_unfreeze` → { file, module, name }
function resolvePath(rustPath) {
  const parts = rustPath.split('::');
  const name = parts[parts.length - 1];
  const modules = parts.slice(0, -1);
  const candidates = [
    path.join('src', ...modules) + '.rs',
    path.join('src', ...modules, 'mod.rs'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(GAME_REPO, candidate))) {
      return { file: candidate, module: modules.join('::'), name };
    }
  }
  return null;
}

/// Línea donde se define `fn name` dentro de un archivo del juego.
function lineOf(file, name) {
  const source = readSource(path.join(GAME_REPO, file));
  const match = source.match(new RegExp(`(?:pub )?fn ${name}\\s*(?:<[^>]*>)?\\s*\\(`));
  if (!match) return null;
  return source.slice(0, match.index).split('\n').length;
}

/// N3: los pub fn de un archivo que simulation.rs no registra — los helpers
/// a los que llegas con un cmd+click más.
function helpersOf(file, registeredNames) {
  const source = readSource(path.join(GAME_REPO, file));
  const helpers = [];
  const regex = /pub fn (\w+)/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    const name = match[1];
    if (registeredNames.has(name)) continue;
    helpers.push({ name, line: source.slice(0, match.index).split('\n').length });
  }
  return helpers;
}

// ── El flowchart de la capa viewer ────────────────────────────────────────────

function generate() {
  const source = readSource(SIMULATION);
  const functions = extractFunctions(source);
  const run = functions.get('run');
  if (!run) throw new Error('simulation.rs sin fn run() — el contrato del parser se rompió');

  // N1: las llamadas de run() a funciones locales de simulation.rs — y las
  // ramas: fns locales llamadas desde una fase (react_to_real_collisions).
  const locals = [...functions.keys()].filter((name) => name !== 'run');
  const calledBy = (callerBody) =>
    locals.filter((name) => new RegExp(`\\b${name}\\s*\\(`).test(callerBody));

  const phases = [];
  const queue = calledBy(run.body).map((name) => ({ name, parent: null }));
  while (queue.length > 0) {
    const { name, parent } = queue.shift();
    if (phases.some((phase) => phase.name === name)) continue;
    phases.push({ name, parent });
    for (const child of calledBy(functions.get(name).body)) {
      if (child !== name) queue.push({ name: child, parent: name });
    }
  }

  const nodes = [];
  const filesInPlay = new Map(); // file → Set(nombres registrados)

  for (const { name: phase, parent } of phases) {
    // Fases se llaman on_*/after_*; una rama condicional (react_*) o un
    // helper local (resolve_*) se distinguen por el nombre — parseable.
    const kind = /^(on_|after_)/.test(phase) ? 'phase' : /^react_/.test(phase) ? 'branch' : 'helper';
    nodes.push({
      id: `simulation::${phase}`,
      name: phase,
      level: 1,
      phase: parent,
      kind,
      file: 'src/simulation.rs',
      line: functions.get(phase).line,
    });

    for (const reference of extractReferences(functions.get(phase).body)) {
      const resolved = resolvePath(reference.path);
      if (!resolved) continue;
      nodes.push({
        id: reference.path,
        name: resolved.name,
        level: 2,
        phase,
        kind: reference.kind,
        file: resolved.file,
        line: lineOf(resolved.file, resolved.name),
      });
      if (!filesInPlay.has(resolved.file)) filesInPlay.set(resolved.file, new Set());
      filesInPlay.get(resolved.file).add(resolved.name);
    }
  }

  // N3: helpers por archivo — un nivel más profundo que los systems
  for (const [file, registered] of filesInPlay) {
    for (const helper of helpersOf(file, registered)) {
      const module = file.replace(/^src\//, '').replace(/\.rs$/, '').replaceAll('/', '::');
      nodes.push({
        id: `${module}::${helper.name}`,
        name: helper.name,
        level: 3,
        phase: null,
        kind: 'helper',
        file,
        line: helper.line,
      });
    }
  }

  // Dedup (un system puede registrarse en dos fases — gana la primera aparición)
  const seen = new Set();
  const unique = nodes.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });

  const commit = execSync('git rev-parse --short HEAD', { cwd: GAME_REPO }).toString().trim();
  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    sourceCommit: commit,
    repo: 'canicasbrawl-rapier',
    phases: phases.map((phase) => phase.name),
    nodes: unique,
  };
}

// ── El sidecar curado: esqueleto la primera vez, tripwire después ─────────────

function syncOverlay(generated) {
  const ids = new Set(generated.nodes.map((node) => node.id));
  let overlay = {};
  if (fs.existsSync(OVERLAY)) {
    overlay = JSON.parse(fs.readFileSync(OVERLAY, 'utf8'));
    const orphans = Object.keys(overlay).filter((id) => !ids.has(id));
    if (orphans.length > 0) {
      console.error('✗ El sidecar menciona nodos que ya no existen en el código:');
      for (const orphan of orphans) console.error(`    ${orphan}`);
      console.error('  Actualiza o elimina esas entradas — nada se desincroniza en silencio.');
      process.exit(1);
    }
  }
  // Los nombres del código son el contenido — el overlay solo guarda el
  // criterio: nivel (si difiere del parser), devOnly, hidden, media.
  for (const node of generated.nodes) {
    if (!overlay[node.id]) {
      overlay[node.id] = { nivel: node.level };
    }
  }
  fs.writeFileSync(OVERLAY, JSON.stringify(overlay, null, 2) + '\n');
  return Object.keys(overlay).length;
}

const generated = generate();
fs.writeFileSync(OUTPUT, JSON.stringify(generated, null, 2) + '\n');
const curated = syncOverlay(generated);

const byLevel = [1, 2, 3].map(
  (level) => `N${level}: ${generated.nodes.filter((node) => node.level === level).length}`,
);
console.log(`✓ flow-viewer.generated.json — ${generated.nodes.length} nodos (${byLevel.join(', ')}) @ ${generated.sourceCommit}`);
console.log(`✓ flow-viewer-overlay.json — ${curated} nodos bajo tu criterio`);
