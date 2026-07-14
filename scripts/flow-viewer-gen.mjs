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
  const match =
    source.match(new RegExp(`(?:pub )?fn ${name}\\s*(?:<[^>]*>)?\\s*\\(`)) ??
    source.match(new RegExp(`(?:pub )?(?:struct|enum) ${name}\\b`));
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

/// ¿La función registra cosas en el App? Entonces es una gorda: un grupo.
function registersInApp(body) {
  return /\bapp\s*\.\s*(add_systems|insert_resource|add_event)/.test(body);
}

/// src/game/world/mod.rs → 'game::world'; src/game/race_events.rs → 'game::race_events'
function moduleOfFile(file) {
  return file.replace(/^src\//, '').replace(/\/mod\.rs$|\.rs$/, '').replaceAll('/', '::');
}

/// Las referencias dentro del cuerpo de una gorda, resueltas contra su módulo:
/// crate::X → X · super::X → padre::X · mod::fn → host::mod::fn · fn local → host::fn
function extractGroupReferences(body, hostModule, hostFunctionNames) {
  const references = [];
  const parentModule = hostModule.split('::').slice(0, -1).join('::');
  const pathRegex = /(crate::|super::)?([a-z_]\w*(?:::[A-Za-z_]\w*)+)/g;
  let match;
  while ((match = pathRegex.exec(body)) !== null) {
    const prefix = match[1] ?? '';
    let full = match[2];
    if (prefix === 'crate::') {
      // absoluto tal cual
    } else if (prefix === 'super::') {
      full = parentModule ? `${parentModule}::${full}` : full;
    } else if (!/^(game|production)::/.test(full)) {
      full = `${hostModule}::${full}`;
    }
    // Tipo::default() / Tipo::new(): la referencia real es el Tipo
    full = full.replace(/::(default|new)$/, '');
    const lastSegment = full.split('::').pop();
    const isType = /^[A-Z]/.test(lastSegment);
    const before = body.slice(Math.max(0, match.index - 60), match.index);
    const isResource = before.includes('insert_resource(');
    if (isType && !isResource) continue;
    references.push({ path: full, kind: isResource ? 'resource' : 'system', at: match.index });
  }
  // Funciones del mismo archivo llamadas por nombre pelón (la banda en race_events.rs)
  for (const name of hostFunctionNames) {
    if (references.some((reference) => reference.path.endsWith(`::${name}`))) continue;
    if (/^[A-Z]/.test(name)) continue;
    const at = body.search(new RegExp(`\\b${name}\\b`));
    if (at !== -1) {
      references.push({ path: `${hostModule}::${name}`, kind: 'system', at });
    }
  }
  // El orden del cuerpo ES el orden del flujo
  references.sort((a, b) => a.at - b.at);
  return references;
}

// ── El flowchart de la capa viewer ────────────────────────────────────────────

/// N0: los brazos del match de main.rs — los modos del programa.
function extractModes() {
  const source = readSource(path.join(GAME_REPO, 'src/main.rs'));
  const modes = [];
  const armRegex = /Command::(\w+)(?:\([^)]*\))?\s*=>\s*\{?\s*([\w:]+)\(/g;
  let match;
  while ((match = armRegex.exec(source)) !== null) {
    const line = source.slice(0, match.index).split('\n').length;
    modes.push({ command: match[1], target: match[2], line });
  }
  return modes;
}

function generate() {
  const source = readSource(SIMULATION);
  const functions = extractFunctions(source);
  const run = functions.get('run');
  if (!run) throw new Error('simulation.rs sin fn run() — el contrato del parser se rompió');

  // N1: las llamadas de run() a funciones locales de simulation.rs — y las
  // fns locales llamadas desde una fase (helpers como finish_target_secs).
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

  for (const mode of extractModes()) {
    nodes.push({
      id: `main::${mode.command}`,
      name: mode.command,
      target: mode.target,
      level: 0,
      phase: null,
      kind: 'mode',
      file: 'src/main.rs',
      line: mode.line,
    });
  }

  for (const { name: phase, parent } of phases) {
    // La clase se decide por CONTENIDO: fase (on_*/after_*), gorda local
    // (registra en el App) o helper. Aquí no hay marcas de modos: el juego
    // declara necesidades (choques, dados) y el engine duerme en la oscuridad
    // a quien declare lo que su mundo no tiene.
    const body = functions.get(phase).body;
    const kind = /^(on_|after_)/.test(phase)
      ? 'phase'
      : registersInApp(body) ? 'group' : 'helper';
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

      const targetFunctions = extractFunctions(readSource(path.join(GAME_REPO, resolved.file)));
      const target = targetFunctions.get(resolved.name);
      const isGroup = reference.kind === 'system' && target && registersInApp(target.body);

      nodes.push({
        id: reference.path,
        name: resolved.name,
        level: 2,
        phase,
        kind: isGroup ? 'group' : reference.kind,
        file: resolved.file,
        line: lineOf(resolved.file, resolved.name),
      });
      if (!filesInPlay.has(resolved.file)) filesInPlay.set(resolved.file, new Set());
      filesInPlay.get(resolved.file).add(resolved.name);

      if (!isGroup) continue;
      // Los hijos de la gorda: lo que registra, colgado bajo su nombre
      const hostModule = moduleOfFile(resolved.file);
      const siblingNames = [...targetFunctions.keys()].filter((name) => name !== resolved.name);
      for (const child of extractGroupReferences(target.body, hostModule, siblingNames)) {
        const childResolved = resolvePath(child.path);
        if (!childResolved) continue;
        nodes.push({
          id: child.path,
          name: childResolved.name,
          level: 2,
          phase: resolved.name,
          kind: child.kind,
          file: childResolved.file,
          line: lineOf(childResolved.file, childResolved.name),
        });
        if (!filesInPlay.has(childResolved.file)) filesInPlay.set(childResolved.file, new Set());
        filesInPlay.get(childResolved.file).add(childResolved.name);
      }
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

/// LA LEY: el código del juego es exclusivamente juego — los flags de modo
/// solo existen en la puerta (args.rs/main.rs) y en el engine. Si alguien mete
/// una pregunta de modo a game/ o simulation.rs, esto truena con la lista.
function enforceGameHasNoModeFlags() {
  const forbidden = /\b(timeline_path|record_duration|write_timeline_duration|session_duration_secs)\s*\(/;
  const zone = [path.join(GAME_REPO, 'src/simulation.rs')];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.rs')) zone.push(full);
    }
  };
  walk(path.join(GAME_REPO, 'src/game'));
  const violations = zone.filter((file) => forbidden.test(fs.readFileSync(file, 'utf8')));
  if (violations.length > 0) {
    console.error('✗ El juego está preguntando por modos — la ley dice que el juego es solo juego:');
    for (const violation of violations) console.error(`    ${path.relative(GAME_REPO, violation)}`);
    console.error('  Los flags viven en la puerta (args.rs) y en el engine. Etiqueta, no preguntes.');
    process.exit(1);
  }
}

enforceGameHasNoModeFlags();
const generated = generate();
fs.writeFileSync(OUTPUT, JSON.stringify(generated, null, 2) + '\n');
const curated = syncOverlay(generated);

const byLevel = [1, 2, 3].map(
  (level) => `N${level}: ${generated.nodes.filter((node) => node.level === level).length}`,
);
console.log(`✓ flow-viewer.generated.json — ${generated.nodes.length} nodos (${byLevel.join(', ')}) @ ${generated.sourceCommit}`);
console.log(`✓ flow-viewer-overlay.json — ${curated} nodos bajo tu criterio`);
