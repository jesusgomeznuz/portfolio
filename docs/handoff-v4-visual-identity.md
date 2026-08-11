# Handoff v4 — nueva identidad visual completa

Este handoff reemplaza la identidad visual de los handoffs anteriores
(v1–v3, layout "4a", tema lima/Inter). Esa versión sirvió su propósito —
fue explícitamente **provisional**, "colores y tipografía para trabajar
mientras se terminaba el contenido". El contenido ya está listo. Ahora
toca la identidad visual definitiva.

**Libertad real**: este handoff da contexto e intención, no una maqueta a
copiar. No se adjunta ninguna captura del sitio actual a propósito — para
no anclar el diseño nuevo a lo que ya existe. Diseña la experiencia con
libertad; los tokens de color/tipografía sí son fijos (ver abajo), el
layout no.

## Quién es Jesus

Programador de físicas/gameplay, basado en México. Trabaja en Rust (Bevy +
Rapier) y C#/Unity. Busca trabajo remoto en una desarrolladora de
videojuegos en Inglaterra o Europa (o reubicación) — gameplay programmer,
physics programmer, tools programmer, engine programmer, nivel júnior-medio.

El diferenciador: no es "otro dev que pide trabajo". Combina **profundidad
técnica real** con **impacto viral comprobado en producción** — construyó
algo que generó views masivos por su cuenta, y una startup de Londres
(Jammable) lo contrató para llevarlo a producción a escala.

## La narrativa (tres actos)

1. **Origen — Canicas virales.** Descubrió por su cuenta que las
   simulaciones de canicas en Rust generaban contenido viral. Empezó a
   crear videos con este método de forma independiente.
2. **Jammable — Londres.** A raíz de ese trabajo, Jammable lo contactó.
   Construyó un game engine completo con Rapier + Rust para producción de
   video masiva: física local (sin cloud), renders en milisegundos, y un
   sistema que permitió a otros usuarios crear contenido viral con sus
   propias canicas. El método se volvió viral a escala, dentro de un
   producto real.
3. **rapier-bevy y los juegos actuales — profundidad técnica.** Después de
   Jammable, construyó `rapier-bevy` (engine reusable) y sobre él dos
   juegos: `canicasbrawl-rapier` (sucesor directo de la idea original) y
   `musical-path-rapier` (juego hermano, física cinemática). Demuestran:
   benchmarks de colliders precalculados vs. VHACD en tiempo real,
   arquitectura limpia (código que se lee como flowchart, sin comentarios
   de "qué hace"), y escalabilidad hacia simulaciones más complejas.

## Lo que debe quedar claro al ver el portafolio

- Impacto real: Jammable, videos virales en producción — no un
  side-project que nadie vio.
- Profundidad técnica: VHACD, compound shapes, joints, pipeline headless
  de video, WASM.
- Arquitectura: código legible como flowchart, criterio claro sobre cuándo
  optimizar y por qué.
- Visión de producto: entiende qué hace que algo se vuelva viral, no solo
  que funcione.

## Requisitos funcionales (esto sí es fijo, el layout que lo resuelve no)

El sitio muestra **tres proyectos**, cada uno necesita:
- Un **explorador de arquitectura** navegable — diagrama de flujo de
  código real (no dibujado a mano), donde los nodos que llaman a otro
  flujo son clickeables y navegan a su propio diagrama. La experiencia de
  "cmd+clic para saltar a una función", en la web. Para `canicasbrawl-rapier`
  esto ya existe y funciona con datos reales.
- Un **demo jugable embebido** (WASM/canvas). Solo el proyecto visible
  debe sonar — al cambiar de proyecto, el demo anterior se pausa/muta.

Proyectos: `canicasbrawl-rapier`, `musical-path-rapier`, `rapier-bevy`.

Preferencia (no obligación): **una sola página**, sin rutas separadas — el
sitio anterior evitaba el scroll vertical tipo feed; esa preferencia sigue
en pie pero es negociable si la nueva experiencia lo justifica.

## Pieza nueva — el flujo de producción con agentes de Claude Code

Esto **no estaba en ningún handoff anterior**. Es contenido nuevo que
Jesus quiere considerar para el portafolio: un diagrama que muestra cómo
construyó un **sistema de producción autónomo con agentes de IA**
(`canicasbrawl-production`, el pipeline que convierte canciones en los
videos virales de la narrativa) — un hilo constante de Jesus + Claude en
conversación, subagentes que se separan a trabajar solo y reportan de
vuelta, y automatización pura donde ya no hace falta ningún modelo.

Es una demostración de habilidad **distinta** a la de los tres proyectos
de motor de físicas — orquestación de agentes, diseño de sistemas
human-in-the-loop, criterio sobre cuándo algo debe ser determinista vs.
cuándo necesita juicio. Vale la pena mostrarlo, pero **cómo encaja en la
narrativa queda abierto** — no es evidencia dentro del acto de Jammable
necesariamente, ni tiene que ser un cuarto acto formal. Es material para
que Claude Design decida dónde y cómo aparece.

Instinto de Jesus sobre el placement (sugerencia, no mandato): el diagrama
es **horizontal**, no encaja bien en paneles verticales/portrait como los
que ya existen para los exploradores de arquitectura — probablemente vive
en una sección propia, más abajo en la misma página, no en un panel
lateral angosto.

Estructura completa del diagrama (8 nodos, orden izquierda→derecha salvo donde se indica):

**Fila principal — "contexto activo" (Jesus + Claude conversando, nunca se corta):**
1. **Agent** — CLAUDE.md, el mapa que siempre está cargado. No es una tarea, es el hilo persistente.
2. **Performance Review** — los dos (ícono de Jesus + Claude juntos). "reviewed together" — leen y discuten el rendimiento reciente.
3. **Song Selection** — Jesus solo decide.
4. **Production Batch** — Claude solo, corre el skill `/production-skill` (departamento `production`). "voice + render" — produce N videos.
5. **Quality Review** — Jesus solo, ve cada video antes de publicar (el checkpoint humano).
6. **Scheduling** — Claude solo, corre el skill `/schedule-skill` (departamento `publisher`).

Loop punteado "feedback": de Quality Review de vuelta a Production Batch — si Jesus pide cambios tras revisar, se repite el batch.

**Arriba — subagentes que SALEN del contexto (trabajan solos, reportan de vuelta, no comparten memoria de la conversación):**
- **Performance Scan** (agent.md `radar.md`) — recolecta métricas/comentarios de tres departamentos (catalog · casting · publisher). Alimenta a Performance Review.
- **Segment Selection** (agent.md `adding-songs.md`) — prepara el segmento/voz/subtítulos de una canción (departamento `catalog`). Sale de Song Selection, entra a Production Batch.
- **Song Discovery** (agent.md `discovery.md`) — encuentra canciones candidatas por familia sonora (departamento `catalog`). Sale de Agent, entra a Song Selection.

**Convención visual del diagrama:**
- Ícono grande y centrado = quién hace ese paso (silueta de Claude / silueta de persona / los dos juntos, mismo tamaño).
- Texto naranja arriba de una caja = qué skill o qué agent.md corre ahí (identidad de Claude Code).
- Texto blanco/oscuro abajo = qué departamento de código (CLI) usa.
- Cajas con fondo (tinte del acento) = el paso corre un procedimiento con nombre propio. Cajas sin fondo, solo borde = plática/criterio, sin procedimiento fijo.
- Dos flechas entrando juntas del lado izquierdo a una misma caja = las dos cosas tienen que terminar antes de que ese paso arranque (como una compuerta AND).

Es horizontal, de izquierda a derecha, con las tres burbujas de subagente arriba de la fila principal como ramificaciones que salen y regresan.

## Identidad visual — tokens fijos

Fuente de verdad: `/Users/jesus/jesus-design-tokens.json` (formato W3C
DTCG). Resumen:

- **Tipografía**: Futura para títulos y etiquetas (sin monoespaciado en
  labels — el mono queda reservado para comandos/frases reales entre
  comillas). Decisión ya tomada, no reabrir.
- **Paleta primaria** (`azul`): familia tonal azul-teal, un solo hue a
  distinta claridad — fondo, panel, borde, texto salen de la misma
  familia, no de colores mezclados. Tiene contraparte `azul-dark` para
  tema oscuro (mismos roles, valores propios — no es azul con opacidad).
- **Acento de marca** (`claude`): naranja `#D97757`, el color real del
  ícono de Claude Code — se usa exclusivamente para marcar "esto lo hizo
  Claude con su propio nombre" (una skill, un subagente). Fijo en los dos
  temas; lo que cambia entre temas es su fondo de acompañamiento
  (`claude.fill-dark` / `claude.fill-light`).
- **Regla de contraste que invierte entre temas**: en dark, el contenedor
  que se quiere resaltar va más claro que la página (mismo sentido que el
  anidado normal). En light, ese mismo contenedor va más oscuro/saturado
  que la página (sentido invertido — ver `azul.callout-fill` y
  `azul-dark.container-fill` en el JSON para el detalle completo).
- **Filosofía, no solo color**: claridad ante todo — nombres que se
  entienden solos, jerarquía visual real (quién hace algo es el
  protagonista, no una nota al pie), sin necesidad de leyenda para
  entender un diagrama a primera vista.

## Inspiración — portafolios de referencia (tono/narrativa, no layout)

**Game developers con narrativa y personalidad:**
- Hugo Peters — hugo.fyi (gameplay programmer, Ubisoft) — abre con "I've
  been making games since I was 7"
- Josh Caratelli — joshcaratelli.com — cuenta stakes, no features ("salvé
  un nivel de ser cortado dos veces")
- Tim Peeters — tim-peeters-game-development.webflow.io — historia desde
  la infancia

**Creative developers con calidez y storytelling:**
- Bruno Simon — bruno-simon.com — el portafolio ES la simulación (navegas
  con física)
- Cassie Evans — cassie.codes — calidez pura, vulnerabilidad auténtica
- Maxime Heckel — maximeheckel.com — convirtió el aprendizaje en identidad
  pública

**Referencia de estructura clara:**
- Brittany Chiang — brittanychiang.com — frase de posicionamiento de una
  línea, progresión narrativa

## Lo que NO va en este handoff (a propósito)

- Capturas del sitio actual (tema lima/Inter) — para no sesgar.
- El HTML del layout "4a" anterior — ese layout queda como historial, no
  como referencia visual.
- Una decisión final de dónde/cómo vive el flujo de producción en la
  narrativa — eso es lo que se le pide a Claude Design que proponga.
