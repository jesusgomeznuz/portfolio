# Handoff — contexto del portafolio

Información de referencia, no instrucciones de diseño. Para armar un prompt de wireframe/diseño.

## Quién soy

Juan Jesús Gómez Núñez. Programador de físicas/gameplay, basado en México. Trabajo en Rust (Bevy + Rapier) y C#/Unity.

## Qué busco

Trabajo remoto en una desarrolladora de videojuegos en Inglaterra o Europa (o reubicación). Posiciones objetivo: gameplay programmer, physics programmer, tools programmer, engine programmer — nivel júnior-medio.

El diferenciador que quiero que quede claro: no soy "otro dev que pide trabajo". Soy alguien que combina **profundidad técnica real** con **impacto viral comprobado en producción** — construí algo que generó views masivos por mi cuenta, y después una startup de Londres (Jammable) me contrató para reconstruirlo a escala de producción.

## La narrativa (tres actos)

1. **Origen — Canicas virales.** Descubrí por mi cuenta que las simulaciones de canicas en Rust generaban contenido viral. Empecé a crear videos con este método de forma independiente, sin que nadie me lo pidiera.
2. **Jammable — Londres.** A raíz de ese trabajo, Jammable (startup de Londres) me contactó. Construí un game engine completo con Rapier + Rust para producción de video masiva: simulaciones físicas complejas corriendo localmente (sin cloud), renders en milisegundos en el dispositivo, y un sistema que permitió a los usuarios de Jammable crear contenido viral con sus propias canicas. El método que yo inicié se volvió viral a escala, dentro de un producto real.
3. **rapier-bevy / los juegos actuales — profundidad técnica.** Después de Jammable quise ir más profundo — no solo usar un motor de físicas, entenderlo desde la fuente. Construí `rapier-bevy` (engine reusable) y sobre él dos juegos: `canicasbrawl-rapier` (el sucesor directo de la idea original) y `musical-path-rapier` (un juego hermano, física cinemática en vez de dinámica). Estos demuestran: benchmarks de colliders precalculados vs. VHACD en tiempo real, arquitectura limpia (todo el código se lee como flowchart, sin comentarios de "qué hace"), y escalabilidad hacia simulaciones más complejas.

## Qué debe quedar claro al ver el portafolio

- Impacto real: Jammable, startup de Londres, videos virales en producción — no un side-project que nadie vio.
- Profundidad técnica: VHACD, compound shapes, joints, pipeline headless de video, WASM.
- Arquitectura: código legible como flowchart, criterio claro sobre cuándo optimizar (precalculado vs. runtime) y por qué.
- Visión de producto: entiendo qué hace que algo se vuelva viral, no solo que funcione.

## Inspiraciones — portafolios de referencia

**Game developers con narrativa y personalidad:**
- Hugo Peters — [hugo.fyi](https://hugo.fyi) (gameplay programmer en Ubisoft) — abre con "I've been making games since I was 7"
- Josh Caratelli — [joshcaratelli.com](https://www.joshcaratelli.com) — cuenta stakes, no features ("salvé un nivel de ser cortado dos veces")
- Tim Peeters — [tim-peeters-game-development.webflow.io](https://tim-peeters-game-development.webflow.io) — historia desde la infancia

**Creative developers con calidez y storytelling:**
- Bruno Simon — [bruno-simon.com](https://bruno-simon.com) — el portafolio ES la simulación (navegas con física)
- Cassie Evans — [cassie.codes](https://www.cassie.codes) — calidez pura, vulnerabilidad auténtica
- Maxime Heckel — [maximeheckel.com](https://maximeheckel.com) — convirtió el aprendizaje en identidad pública

**Referencia de estructura clara:**
- Brittany Chiang — [brittanychiang.com](https://brittanychiang.com) — frase de posicionamiento de una línea, progresión narrativa

## Estado actual del sitio

- Stack: Astro 6, sitio estático, todo en `src/pages/index.astro` (más componentes React nuevos para partes interactivas).
- Identidad visual ya construida: tema oscuro, fondo casi negro (`#0c0c0e`), acento verde lima (`#b8e832`), tipografía Inter.
- Ya existe un demo interactivo embebido (simulación de físicas vía iframe, "Rube Goldberg machine").
- Fase actual: prueba-error de contenido y experiencia, **no** diseño final — se prioriza que las cosas funcionen antes que se vean pulidas.

## Los tres proyectos que va a mostrar el sitio

- **canicasbrawl-rapier** — demo de físicas interactivo + un explorador de arquitectura interactivo (diagrama de flujo navegable con clics, de `main.rs` hacia cada módulo, con links directos al código en GitHub).
- **musical-path-rapier** — mismo tratamiento de explorador de arquitectura interactivo (juego hermano, física cinemática).
- **rapier-bevy** — se queda con su demo de físicas actual por ahora (no se ha decidido si se retira).

## Lo nuevo de esta sesión — el explorador de arquitectura

Es una pieza construida esta sesión: un diagrama de flujo real (generado con Mermaid.js, no dibujado a mano) donde los nodos que llaman a otro flujo son clickeables y navegan a su propio diagrama — la experiencia de "cmd+clic para saltar a una función" pero en la web. Estilo visual resuelto hasta ahora: fondo negro, contornos tipo marcador dibujado a mano (sin relleno hachurado), líneas blancas, colores por rol del nodo (no decorativos). Vive arriba de todo en la página ahora mismo, pero el layout general (cuánto espacio ocupa cada bloque, cómo se relaciona con el resto del contenido) todavía no está resuelto.
