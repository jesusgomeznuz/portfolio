export interface FlowNode {
  id: string;
  label: string;
  file: string;
  parent: string | null;
  order: number;
  description: string;
  signatures: string[];
}

export interface RepoFlow {
  repoSlug: string;
  repoLabel: string;
  githubUser: string;
  nodes: FlowNode[];
}

export const canicasbrawlFlow: RepoFlow = {
  repoSlug: 'canicasbrawl-rapier',
  repoLabel: 'CanicasBrawl',
  githubUser: 'jesusgomeznuz',
  nodes: [
    {
      id: 'main',
      label: 'main.rs',
      file: 'src/main.rs',
      parent: null,
      order: 1,
      description:
        'Flowchart raíz: tres comandos, tres rutas. Nada se esconde detrás de un Plugin — cmd+clic en cualquier system salta a su implementación real.',
      signatures: ['fn main()'],
    },
    {
      id: 'args',
      label: 'args.rs',
      file: 'src/args.rs',
      parent: 'main',
      order: 2,
      description:
        'Todo el parseo de CLI: qué comando correr, con qué roster, con qué paleta. Separado de main.rs para que el entry point se lea de un vistazo.',
      signatures: [
        'pub enum Command { Simulation(..), BuildModules, PreprocessConcaveColliders }',
        'pub enum RosterSpec { Default, Characters(Vec<String>), Slots(usize) }',
        'pub fn parse_command() -> Command',
      ],
    },
    {
      id: 'simulation',
      label: 'simulation.rs',
      file: 'src/simulation.rs',
      parent: 'main',
      order: 3,
      description:
        'El flowchart del juego: cinco fases con nombre de momento (on_start → on_step → on_frame_update → after_frame_update → on_exit) y una sola rama — si no hay timeline que reproducir, escucha los choques reales.',
      signatures: [
        'pub fn run(mode: SimulationMode, seed: u64, spec: RosterSpec, palette: ColorPalette)',
        'fn on_start(app: &mut App, ..) / on_step / on_frame_update / after_frame_update / on_exit',
        'if timeline_path().is_none() { react_to_real_collisions(app) }',
      ],
    },
    {
      id: 'race_events',
      label: 'game/race_events.rs',
      file: 'src/game/race_events.rs',
      parent: 'simulation',
      order: 4,
      description:
        'La ADUANA de eventos: el vocabulario del juego como enum tipado, con escritura (payload) y lectura (parse) juntas — una sola fuente de verdad del formato. Un sobre ilegible hace panic, nunca falla en silencio.',
      signatures: [
        'pub enum RaceEvent { Freeze{..}, Shrink{..}, Swap{..}, Bouncy{..}, Module{..}, Finish{..} }',
        'pub fn payload(&self) -> String / pub fn parse(payload: &str) -> RaceEvent',
        'pub fn send_race_events_to_timeline(..) / emit_race_events_from_timeline(..)',
      ],
    },
    {
      id: 'staging',
      label: 'game/staging.rs',
      file: 'src/game/staging.rs',
      parent: 'simulation',
      order: 5,
      description:
        'La escenografía única de ambos mundos: consume RaceEvents (de choques reales o de la partitura, sin distinguirlos) y monta todo lo visible que las poses no capturan — hielos, anillos, módulos, la meta.',
      signatures: ['pub fn stage_race_events(..)'],
    },
    {
      id: 'roster',
      label: 'game/roster.rs',
      file: 'src/game/roster.rs',
      parent: 'simulation',
      order: 6,
      description:
        'El casting: quién corre la carrera. Roster real por nombres, o slots anónimos para el flujo de producción (la física se escribe anónima y el cast viste al reproducir).',
      signatures: [
        'pub fn build_roster(characters: Option<Vec<String>>) -> Result<Vec<MarbleConfig>, String>',
        'pub fn slots_roster(n: usize) -> Result<Vec<MarbleConfig>, String>',
      ],
    },
    {
      id: 'marbles',
      label: 'game/marbles.rs',
      file: 'src/game/marbles.rs',
      parent: 'simulation',
      order: 7,
      description:
        'La canica: componentes de identidad, el ensamblador (cuerpo + etiqueta + cara) y su mesh custom con borde.',
      signatures: [
        'pub struct Marble / MarbleName / MarbleIndex',
        'pub fn spawn_marbles(..)',
      ],
    },
    {
      id: 'labels',
      label: 'game/labels.rs',
      file: 'src/game/labels.rs',
      parent: 'marbles',
      order: 8,
      description:
        'Las etiquetas de nombre: texto con outline que sigue a cada canica en pantalla, leyendo posiciones ya resueltas (PostUpdate).',
      signatures: ['pub fn spawn_marble_label(..)', 'pub fn update_marble_labels(..)'],
    },
    {
      id: 'faces',
      label: 'game/faces.rs',
      file: 'src/game/faces.rs',
      parent: 'marbles',
      order: 9,
      description:
        'La cara del personaje: disco de color + PNG, y el color dominante extraído de la imagen para pintar el cuerpo.',
      signatures: ['pub fn attach_marble_face(..)', 'pub fn dominant_color_from_png(..) -> Option<Color>'],
    },
    {
      id: 'camera',
      label: 'game/camera.rs',
      file: 'src/game/camera.rs',
      parent: 'simulation',
      order: 10,
      description:
        'Solo cámara: spawn con luces, seguir a la canica más baja, y los checks de encuadre que la física consulta (qué sensores disparan, qué compuertas se apagan).',
      signatures: [
        'pub fn spawn_camera_and_lights(..)',
        'pub fn camera_follows_lowest_marble(..)',
        'pub fn world_pos_on_screen(..) / world_y_above_screen(..)',
      ],
    },
    {
      id: 'finish',
      label: 'game/finish.rs',
      file: 'src/game/finish.rs',
      parent: 'simulation',
      order: 11,
      description:
        'La meta y el orden de llegada: el cruce se detecta comparando Y, sin sensor físico — inmune al tunneling.',
      signatures: ['pub fn spawn_finish_line(..)', 'pub fn check_finish_crossing(..)'],
    },
    {
      id: 'leader',
      label: 'game/leader.rs',
      file: 'src/game/leader.rs',
      parent: 'simulation',
      order: 12,
      description:
        'Quién va ganando (la canica más baja, sin suavizado) y su corona — el líder es dueño de decidirlo y de mostrarlo.',
      signatures: ['pub fn update_race_leader(..)', 'pub fn spawn_crown(..)', 'pub fn crown_follows_leader(..)'],
    },
    {
      id: 'level_generation',
      label: 'game/world/level_generation.rs',
      file: 'src/game/world/level_generation.rs',
      parent: 'simulation',
      order: 13,
      description:
        'El director del nivel: decide cuándo generar, cuál módulo (pool ponderado, sin repetir), dónde va la meta, y qué compuertas apagar fuera de pantalla. Decide y EMITE — no spawnea.',
      signatures: [
        'pub fn generate_level(..)',
        'fn decide_level_action(..) -> LevelGenerationAction',
        'pub fn disable_modules_above_screen(..)',
      ],
    },
    {
      id: 'modules',
      label: 'game/world/modules.rs',
      file: 'src/game/world/modules.rs',
      parent: 'level_generation',
      order: 14,
      description:
        'El constructor: qué ES un módulo — la aduana del JSON (serde valida o panic) y su materialización determinista (mismo seed → mismos cuerpos con mismas TimelineKeys).',
      signatures: [
        'pub enum WorldObject { Box, Sphere, Mesh, Image, Effect, EffectSlot }',
        'pub fn load_module(name: &str) -> ModuleData',
        'pub fn spawn_module(..) -> f32',
      ],
    },
    {
      id: 'pickups',
      label: 'game/world/pickups.rs',
      file: 'src/game/world/pickups.rs',
      parent: 'modules',
      order: 15,
      description:
        'Qué power-up cae en cada slot del módulo: la ruleta ponderada, el sensor invisible, el marcador de efecto y el icono giratorio.',
      signatures: ['pub fn resolve_slot_variant(..)', 'pub fn spawn_invisible_sensor(..)', 'pub fn attach_effect_marker(..)'],
    },
    {
      id: 'world_setup',
      label: 'game/world/setup.rs',
      file: 'src/game/world/setup.rs',
      parent: 'simulation',
      order: 16,
      description: 'El arranque del escenario: paredes iniciales, gravedad, estado del generador y spawn de canicas.',
      signatures: ['pub fn setup(..)', 'pub fn set_gravity(..)'],
    },
    {
      id: 'structures',
      label: 'game/world/structures.rs',
      file: 'src/game/world/structures.rs',
      parent: 'level_generation',
      order: 17,
      description: 'Suelo y paredes — los helpers de construcción que setup y el director comparten.',
      signatures: ['pub fn spawn_floor(..)', 'pub fn spawn_wall_segment(..)'],
    },
    {
      id: 'freeze',
      label: 'game/sensors/freeze.rs',
      file: 'src/game/sensors/freeze.rs',
      parent: 'simulation',
      order: 18,
      description:
        'El sensor de congelar: al contacto aplica SOLO la física (cuerpo kinemático, grupos fantasma) y emite RaceEvent::Freeze; el hielo lo pone la escenografía. try_unfreeze degrada solo: sin Rapier, solo expira el visual.',
      signatures: ['pub fn on_freeze_contact(..)', 'pub fn try_unfreeze(..)', 'pub fn marble_groups() / frozen_groups()'],
    },
    {
      id: 'shrink',
      label: 'game/sensors/shrink.rs',
      file: 'src/game/sensors/shrink.rs',
      parent: 'simulation',
      order: 19,
      description: 'El sensor de encoger: escala la canica (viaja en las poses) y emite su evento.',
      signatures: ['pub fn on_shrink_contact(..)', 'pub fn try_unshrink(..)'],
    },
    {
      id: 'swap',
      label: 'game/sensors/swap.rs',
      file: 'src/game/sensors/swap.rs',
      parent: 'simulation',
      order: 20,
      description: 'El sensor de intercambio: teletransporta a la canica con quien va adelante y emite; los anillos morados son de la escenografía.',
      signatures: ['pub fn on_swap_contact(..)', 'pub fn fade_swap_rings(..)'],
    },
    {
      id: 'bouncy',
      label: 'game/sensors/bouncy.rs',
      file: 'src/game/sensors/bouncy.rs',
      parent: 'simulation',
      order: 21,
      description: 'Obstáculos que pulsan al contacto según la velocidad de impacto — el pulso viaja como evento (los estáticos no viven en las poses).',
      signatures: ['pub fn trigger_bouncy_pulse(..)', 'pub fn animate_bounce_pulse(..)'],
    },
    {
      id: 'badges',
      label: 'game/sensors/badges.rs',
      file: 'src/game/sensors/badges.rs',
      parent: 'simulation',
      order: 22,
      description: 'El badge de temporizador que freeze y shrink comparten: arco que se consume, mutado in-place en el mesh para forzar el re-upload al GPU.',
      signatures: ['pub fn spawn_badge(..)', 'pub fn update_badges(..)'],
    },
    {
      id: 'icons',
      label: 'game/sensors/icons.rs',
      file: 'src/game/sensors/icons.rs',
      parent: 'simulation',
      order: 23,
      description: 'El icono giratorio que flota sobre cada sensor — compartido por los tres efectos.',
      signatures: ['pub struct SpinningIcon', 'pub fn spin_icons(..)'],
    },
    {
      id: 'palette',
      label: 'game/background/palette.rs',
      file: 'src/game/background/palette.rs',
      parent: 'simulation',
      order: 23,
      description: 'Las tres paletas (azul/rosa/neon) que tiñen cielo, nubes, obstáculos y ClearColor.',
      signatures: ['pub struct ColorPalette', 'pub fn azul() / rosa() / neon()', 'pub fn obstacle_color(&self) -> Color'],
    },
    {
      id: 'sky',
      label: 'game/background/sky.rs',
      file: 'src/game/background/sky.rs',
      parent: 'simulation',
      order: 24,
      description: 'El cielo: quad con textura de gradiente que sigue a la cámara.',
      signatures: ['pub fn spawn_sky(..)', 'pub fn update_sky_with_camera(..)'],
    },
    {
      id: 'stars',
      label: 'game/background/stars.rs',
      file: 'src/game/background/stars.rs',
      parent: 'simulation',
      order: 25,
      description: 'Campo de estrellas determinista por seed (jitter sobre grid), con parpadeo y seguimiento de cámara propios.',
      signatures: ['pub fn spawn_stars(..)', 'pub fn stars_follow_camera(..)', 'pub fn twinkle_stars(..)'],
    },
    {
      id: 'clouds',
      label: 'game/background/clouds.rs',
      file: 'src/game/background/clouds.rs',
      parent: 'simulation',
      order: 26,
      description: 'Nubes cartoon en tres capas de parallax, con wrap para carreras largas.',
      signatures: ['pub fn spawn_clouds(..)', 'pub fn update_clouds(..)'],
    },
    {
      id: 'voice_tracker',
      label: 'production/voice_tracker.rs',
      file: 'src/production/voice_tracker.rs',
      parent: 'simulation',
      order: 27,
      description:
        'Quién lidera en cada momento, como segmentos con timestamps — el contrato con el pipeline de producción (decide el reparto de voces del cover).',
      signatures: ['pub fn track_race_leader(..)', 'pub fn save_voice_tracker_on_exit(..)'],
    },
    {
      id: 'stall_detector',
      label: 'production/stall_detector.rs',
      file: 'src/production/stall_detector.rs',
      parent: 'simulation',
      order: 28,
      description: 'Watchdog wall-clock: si el solver se atasca, cierra la app en vez de colgar el batch de producción.',
      signatures: ['pub fn detect_stall(..)'],
    },
    {
      id: 'process_modules',
      label: 'process_modules/',
      file: 'src/process_modules/mod.rs',
      parent: 'main',
      order: 29,
      description:
        'El convertidor del editor — espejo escritor de spawn_module: lee los exports crudos de Figma y produce los JSON finales que el juego consume.',
      signatures: ['pub fn run()', 'fn transform(raw: RawModule, ..) -> ModuleData'],
    },
    {
      id: 'pm_shapes',
      label: 'process_modules/shapes.rs',
      file: 'src/process_modules/shapes.rs',
      parent: 'process_modules',
      order: 30,
      description: 'Un convertidor por forma (box, sphere, torus, image, effect, slot) + el parseo de tags del nombre de Figma.',
      signatures: ['pub fn world_object_from_raw(..) -> WorldObject'],
    },
    {
      id: 'pm_torus_assets',
      label: 'process_modules/torus_assets.rs',
      file: 'src/process_modules/torus_assets.rs',
      parent: 'process_modules',
      order: 31,
      description: 'La fábrica de assets del torus: genera el .obj procedural y su .compound VHACD si no existen.',
      signatures: ['pub fn ensure_torus_assets(major_r: f32, minor_r: f32) -> String'],
    },
  ],
};
