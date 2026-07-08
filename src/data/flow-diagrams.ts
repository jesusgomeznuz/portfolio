export type NodeLink = { type: 'diagram'; target: string } | { type: 'file'; target: string };

export interface DiagramLevel {
  id: string;
  title: string;
  mermaid: string;
  links: Record<string, NodeLink>;
}

export const canicasbrawlDiagrams: DiagramLevel[] = [
  {
    id: 'main',
    title: 'main.rs — flowchart raíz',
    mermaid: `
flowchart TD
    Start([cargo run]) --> Parse[args::parse_command]
    Parse --> Match{match Command}
    Match -->|BuildModules| Editor[process_modules::run]
    Match -->|PreprocessConcaveColliders| Pre[preprocess_concave_colliders]
    Match -->|Simulation| Sim[simulation::run]
    Editor --> End([exit])
    Pre --> End
    Sim --> Loop([app.run — loop hasta AppExit])
    Loop --> End

    classDef neutral stroke:#e5e5e5,color:#e5e5e5,fill:transparent,stroke-width:3px
    classDef green stroke:#4ade80,color:#4ade80,fill:transparent,stroke-width:3px
    classDef teal stroke:#2dd4bf,color:#2dd4bf,fill:transparent,stroke-width:3px
    classDef blue stroke:#4fc3f7,color:#4fc3f7,fill:transparent,stroke-width:3px
    class Start,Match,End neutral
    class Parse teal
    class Editor,Pre green
    class Sim,Loop blue
`,
    links: {
      Parse: { type: 'file', target: 'args' },
      Editor: { type: 'file', target: 'process_modules' },
      Sim: { type: 'diagram', target: 'simulation_run' },
    },
  },
  {
    id: 'simulation_run',
    title: 'simulation.rs — las cinco fases del App',
    mermaid: `
flowchart TD
    EntryNode([simulation::run]) --> RosterChoice{resolve_roster}
    RosterChoice -->|Default / Characters| RNames[roster::build_roster]
    RosterChoice -->|Slots n| RSlots[roster::slots_roster]
    RNames --> S1
    RSlots --> S1

    subgraph on_start [on_start — dispara una vez al arrancar]
        direction LR
        S1[10 resources:<br/>palette, tracker, resultado,<br/>líder, roster, seed, meta]
        S2[camera::spawn_camera_and_lights]
        S3[leader::spawn_crown]
        S4[setup::setup + set_gravity]
        S5[sky::spawn_sky]
        S6[stars::spawn_stars]
        S7[clouds::spawn_clouds]
    end

    S7 --> F1
    subgraph on_step_lider [on_step — cadena de liderazgo]
        direction LR
        F1[finish::check_finish_crossing] --> F2[leader::update_race_leader] --> F3[voice_tracker::track_race_leader]
    end

    F3 --> B1
    subgraph on_step_banda [on_step — banda de eventos, igual en todos los mundos]
        direction LR
        B1[race_events::emit_race_events_from_timeline] --> B2[race_events::send_race_events_to_timeline] --> B3[staging::stage_race_events]
    end

    B3 --> E1
    subgraph on_step_timers [on_step — timers y cámara, en paralelo]
        direction LR
        E1[freeze::try_unfreeze]
        E2[shrink::try_unshrink]
        E3[swap::fade_swap_rings]
        E4[icons::spin_icons]
        E5[bouncy::animate_bounce_pulse]
        E6[bouncy::tick_bounce_cooldown]
        E7[camera::camera_follows_lowest_marble]
    end

    E7 --> U1
    subgraph on_frame [on_frame_update — cada frame de pantalla]
        direction LR
        U1[sky::update_sky_with_camera]
        U2[stars::stars_follow_camera]
        U3[stars::twinkle_stars]
        U4[clouds::update_clouds]
        U5[freeze::manage_freeze_badges]
        U6[shrink::manage_shrink_badges]
        U7[stall_detector::detect_stall]
    end

    U7 --> P1
    subgraph after_frame [after_frame_update — posiciones ya finales]
        direction LR
        P1[labels::update_marble_labels]
        P2[leader::crown_follows_leader]
        P3[badges::update_badges]
    end

    P3 --> LastS[on_exit: voice_tracker::save_voice_tracker_on_exit]
    LastS --> Branch{timeline_path .is_none?<br/>¿no hay timeline que reproducir?}

    Branch -->|sí — mundo con física| W1
    subgraph Fisica [react_to_real_collisions — detectan, aplican física y EMITEN RaceEvent]
        direction LR
        W1[level_generation::generate_level]
        W2[level_generation::disable_modules_above_screen]
        W3[freeze::on_freeze_contact]
        W4[shrink::on_shrink_contact]
        W5[swap::on_swap_contact]
        W6[bouncy::trigger_bouncy_pulse]
    end

    Branch -->|no — mundo actuado| PlayN[nada extra:<br/>el PlayPlugin del engine escribe poses<br/>y re-emite; la banda común escenifica]

    W6 --> LoopEnd([app.run])
    PlayN --> LoopEnd

    classDef neutral stroke:#e5e5e5,color:#e5e5e5,fill:transparent,stroke-width:3px
    classDef teal stroke:#2dd4bf,color:#2dd4bf,fill:transparent,stroke-width:3px
    classDef green stroke:#4ade80,color:#4ade80,fill:transparent,stroke-width:3px
    classDef blue stroke:#4fc3f7,color:#4fc3f7,fill:transparent,stroke-width:3px
    classDef yellow stroke:#facc15,color:#facc15,fill:transparent,stroke-width:3px
    classDef purple stroke:#a78bfa,color:#a78bfa,fill:transparent,stroke-width:3px
    classDef orange stroke:#fb923c,color:#fb923c,fill:transparent,stroke-width:3px
    classDef red stroke:#f87171,color:#f87171,fill:transparent,stroke-width:3px
    class EntryNode,RosterChoice,Branch,LoopEnd neutral
    class RNames,RSlots teal
    class S1,S2,S3,S4,S5,S6,S7 green
    class F1,F2,F3,E1,E2,E3,E4,E5,E6,E7 blue
    class B1,B2,B3 yellow
    class U1,U2,U3,U4,U5,U6,U7,P1,P2,P3,LastS purple
    class W1,W2,W3,W4,W5,W6 orange
    class PlayN red
`,
    links: {
      RNames: { type: 'file', target: 'roster' },
      RSlots: { type: 'file', target: 'roster' },
      S2: { type: 'file', target: 'camera' },
      S3: { type: 'file', target: 'leader' },
      S4: { type: 'file', target: 'world_setup' },
      S5: { type: 'file', target: 'sky' },
      S6: { type: 'file', target: 'stars' },
      S7: { type: 'file', target: 'clouds' },
      F1: { type: 'file', target: 'finish' },
      F2: { type: 'file', target: 'leader' },
      F3: { type: 'file', target: 'voice_tracker' },
      B1: { type: 'file', target: 'race_events' },
      B2: { type: 'file', target: 'race_events' },
      B3: { type: 'file', target: 'staging' },
      E1: { type: 'file', target: 'freeze' },
      E2: { type: 'file', target: 'shrink' },
      E3: { type: 'file', target: 'swap' },
      E4: { type: 'file', target: 'icons' },
      E5: { type: 'file', target: 'bouncy' },
      E6: { type: 'file', target: 'bouncy' },
      E7: { type: 'file', target: 'camera' },
      U1: { type: 'file', target: 'sky' },
      U2: { type: 'file', target: 'stars' },
      U3: { type: 'file', target: 'stars' },
      U4: { type: 'file', target: 'clouds' },
      U5: { type: 'file', target: 'freeze' },
      U6: { type: 'file', target: 'shrink' },
      U7: { type: 'file', target: 'stall_detector' },
      P1: { type: 'file', target: 'labels' },
      P2: { type: 'file', target: 'leader' },
      P3: { type: 'file', target: 'badges' },
      LastS: { type: 'file', target: 'voice_tracker' },
      W1: { type: 'file', target: 'level_generation' },
      W2: { type: 'file', target: 'level_generation' },
      W3: { type: 'file', target: 'freeze' },
      W4: { type: 'file', target: 'shrink' },
      W5: { type: 'file', target: 'swap' },
      W6: { type: 'file', target: 'bouncy' },
      PlayN: { type: 'file', target: 'staging' },
    },
  },
];
