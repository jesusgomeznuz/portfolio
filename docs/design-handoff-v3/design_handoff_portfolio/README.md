# Handoff: Portafolio — layout provisional (opción 4a, "full-bleed / demo + diagrama dominan")

## Overview
Portafolio personal de **Juan Jesús Gómez Núñez**, physics & gameplay programmer (Rust · Bevy · Rapier · C#/Unity), buscando trabajo remoto júnior-medio en UK/EU. El sitio comunica en un solo vistazo: (1) quién es y su posicionamiento, (2) su trayectoria narrativa (canicas virales → Jammable/Londres → engine propio), y (3) un explorador interactivo de sus 3 proyectos técnicos, cada uno con un **explorador de arquitectura de código** (izquierda) y un **demo físico jugable** (derecha) en el mismo formato fijo.

El layout aprobado es **4a**: **full-bleed** (usa toda la pantalla, sin tarjeta/borde/sombra) y el par **diagrama + demo domina casi todo el viewport** para que la gráfica sea legible. Todo lo demás (identidad, trayectoria, CTAs, selector de proyectos) queda reducido a las orillas.

## About the Design Files
El archivo incluido (`Portafolio provisional.dc.html`) es una **referencia de diseño en HTML** — un prototipo del look y comportamiento pretendidos, **no código de producción para copiar**. Usa un runtime propio (`support.js`, plantillas `<x-dc>`, `sc-if`, `{{ }}`) que **no debe portarse**; es solo el andamiaje del prototipo.

La tarea es **recrear el diseño en el portafolio real** (el usuario trabaja en **Astro**, tema oscuro), usando sus patrones/librerías establecidas. El prototipo contiene **varias opciones apiladas** (4a arriba, luego 3a, 2a, 1a/1b); **solo 4a es la dirección aprobada** — el resto es historial de exploración y debe ignorarse.

## Fidelity
**Baja fidelidad intencional**, con **colores y tipografía reales** (definitivos). Layout provisional "para trabajar mientras se termina el contenido". El desarrollador debe:
- Respetar **estructura, jerarquía y proporciones** (esto es lo validado — sobre todo que el diagrama+demo dominen).
- Respetar los **tokens** listados abajo.
- Tratar el relleno rayado (demo) y el diagrama de cajas (arquitectura) como **placeholders** — se reemplazan por iframes/embeds reales.
- No tratar micro-espaciados como pixel-perfect.

> **Nota de historial**: el usuario cambió de opinión sobre lados. La versión final y correcta es **diagrama a la IZQUIERDA, demo a la DERECHA**. No invertir.

## Screens / Views

### Vista única — Landing full-bleed (4a)
- **Nombre**: Home / landing (single-page, sin rutas, sin scroll — cabe en el viewport).
- **Propósito**: El visitante entiende de inmediato quién es Juan y explora sus proyectos (código + demo) sin esfuerzo cognitivo.
- **Contenedor**: ocupa el viewport completo (en el prototipo 1760×980 `max-width:100%`). **Sin** `border`, **sin** `border-radius`, **sin** `box-shadow`. Fondo `#0c0c0e`. `overflow:hidden; display:flex; flex-direction:column`. Se divide en:
  1. **Barra superior (top edge)** — identidad + CTAs. `flex-shrink:0`.
  2. **Main** (`flex:1; display:grid; grid-template-columns:212px 1fr`) — riel izquierdo angosto + visor enorme.

#### Barra superior (orilla)
- `display:flex; align-items:center; justify-content:space-between; gap:24px; padding:14px 26px; border-bottom:1px solid #1a1a1e; flex-wrap:wrap`.
- **Izquierda** (baseline, `gap:14px`): Nombre `Juan Jesús Gómez Núñez` (Inter 800, 18px, `#f4f4f6`, `letter-spacing:-.02em`) · rol `Physics & gameplay programmer` (Inter 600, 12px, acento `#b8e832`) · ubicación `México · remoto UK / EU` (JetBrains Mono 400, 10px, `#78787f`).
- **Derecha** (`gap:9px`): stack `Rust · Bevy · Rapier · C#/Unity` (Mono 400 10px `#78787f`) + botón **Email** primario (`background:#b8e832; color:#0c0c0e; padding:7px 13px; border-radius:7px`, Inter 600 12px) + **GitHub** y **CV** secundarios (`border:1px solid #2b2b31; color:#ededf0`).

#### Riel izquierdo (orilla, 212px) — identidad + trayectoria
- `border-right:1px solid #1a1a1e; padding:20px; display:flex; flex-direction:column; overflow:hidden`.
- **Posicionamiento** (Inter 400, 12.5px/1.5, `#cfcfd5`): "No soy otro dev pidiendo trabajo. Lo que construí se volvió viral por mi cuenta — y Londres me contrató para llevarlo a producción."
- **Chips** (`gap:7px`, pills `padding:4px 9px; border:1px solid #2b2b31; border-radius:999px`, Mono 600 9.5px): `Ex-Jammable · Londres` (acento) · `videos virales` (`#b7b7bf`).
- **Título** `La trayectoria` (Mono 600 10px uppercase `letter-spacing:.14em` `#6f6f78`).
- **Tres actos** (grid `26px 1fr; gap:10px`, divisores `border-bottom:1px solid #17171b`): número Mono 800 15px acento; título Inter 700 12.5px `#ededf0`; cuerpo Inter 400 11px/1.45 `#9c9ca4`.
  - **01 · Canicas virales**: "Descubrí solo el método viral con simulaciones en Rust."
  - **02 · Jammable — Londres**: "Engine con Rapier + Rust: física local, renders on-device. Viral a escala en un producto real."
  - **03 · Engine propio**: "`rapier-bevy` + dos juegos. Explóralos →" (`rapier-bevy` Mono 10.5px `#cdd3c0`; "Explóralos →" en acento).
- **Pie del riel** (`margin-top:auto`, Mono 400 9.5px `#5f5f66`): "Elegí un proyecto arriba → demo y flujo de código en el mismo lugar."

#### Visor (columna derecha, `1fr`) — DOMINA la pantalla
`display:flex; flex-direction:column; min-height:0`. Dos partes:

**1. Tira de pestañas de proyecto (orilla superior del visor)** — `display:flex; align-items:stretch; border-bottom:1px solid #1a1a1e; flex-shrink:0`.
- Cada pestaña: `cursor:pointer; padding:12px 22px; border-right:1px solid #1a1a1e; flex-direction:column; gap:2px`. Hover `background:#0e0e11`.
- Indicador de activa: barra de **2px en acento `#b8e832`** en el borde superior de la pestaña seleccionada (con margen negativo para pegarla al top).
- Contenido: nombre repo (Mono 600 13px `#ededf0`) + subtítulo (Mono 400 10px `#78787f`).
- Pestañas: `canicasbrawl` ("demo · arquitectura"), `musical-path` ("demo · arquitectura"), `rapier-bevy` ("demo · engine").
- A la derecha de la tira (flex-fill): nota "Mismo formato siempre — cambiá sin reaprender." (Inter 11px `#6f6f78`) + link `GitHub ↗` (Mono 500 12px acento).

**2. Split diagrama | demo (`flex:1; display:grid; grid-template-columns:1fr 1fr`)** — llena TODO el alto restante. Este es el corazón de 4a.
- **IZQUIERDA = Explorador de arquitectura**: `background:#0a0a0c; border-right:1px solid #1a1a1e; position:relative; center content`. Label superior-izq "Explorador de arquitectura" (Mono 600 10px uppercase `#6f6f78`). Contenido = **diagrama de flujo de código navegable** (placeholder de cajas): nodo raíz (`main.rs` / `lib.rs — engine root`) → hijos (`setup`/`systems`/`assets`, o `physics_step`/`colliders`/`bevy_plugin` para el engine) → nietos. Cajas `border:1.5px solid; border-radius:9px; padding:9px 18-20px`, Mono 600 12-13px; nodo activo/entrada en acento `#b8e832`, secundarios en `#6a6a72`/`#a9a9b1`, raíz neutra `#d8d8d8`; conectores línea 1px `#3a3a40`. Pie: "clic en un nodo para navegar el flujo del código →" (Mono 10px `#5f5f66`). **Aquí va el explorador real** (el usuario ya tiene un flowchart interactivo tipo `CARGO RUN → CLI::PARSE_COMMAND → MATCH COMMAND → …`).
- **DERECHA = Demo físico** (lo más llamativo): `background:#0e0e11` con textura rayada `repeating-linear-gradient(45deg,#131317 0 11px,#0e0e11 11px 22px)`; label superior-izq "Demo físico". **Aquí va el iframe del demo** (WASM/canvas jugable). Placeholder: "demo jugable · iframe WASM → (solo suena el que está enfrente)". Para `rapier-bevy`: "demo físico del engine · iframe WASM →".

## Interactions & Behavior
- **Swap de proyecto (clave)**: clic en una pestaña cambia el contenido del split. **Formato fijo**: diagrama siempre a la izquierda, demo siempre a la derecha, mismo lugar — el visitante no reaprende cómo explorar cada proyecto. La pestaña activa marca la barra de 2px en acento.
- **Regla de audio (importante)**: solo se muestra un proyecto a la vez, así que **el demo no visible debe pausarse/silenciarse** y solo suena el que está enfrente. Al hacer swap: pausar/mutear el iframe saliente, reanudar/activar el entrante. Elimina sonidos superpuestos y la sensación de "no controlar" reproducciones.
- **Sin scroll**: todo cabe en el viewport; nada de feed vertical de celular.
- **Full-bleed**: el contenido llega hasta las orillas; nada de tarjeta centrada con márgenes decorativos (el usuario rechazó el borde explícitamente).
- **Hover**: pestañas aclaran fondo a `#0e0e11`; links en acento aclaran a `#cff05a`.
- **Explorador de arquitectura navegable**: clic en nodos para recorrer el flujo del código (en el prototipo es estático; implementar la navegación real).
- **CTAs**: Email (mailto), GitHub y CV (PDF) en la barra superior; link GitHub por proyecto en la tira de pestañas.

## State Management
- `selectedProject`: `'canicas' | 'musical' | 'rapier'` (default `'canicas'`). Único estado; controla qué muestra el split y qué pestaña marca el acento.
- Derivado útil: `isRapier` (su demo ocupa distinto label; su diagrama usa nodos de engine).
- Al cambiar: pausar el media del proyecto anterior, activar el nuevo (ver regla de audio).
- Sin data fetching; demos y explorador se cargan como iframes/embeds/componentes locales cuando estén listos.

## Design Tokens
**Colores**
- Fondo página / superficie principal: `#0c0c0e`
- Panel diagrama (elevado oscuro): `#0a0a0c`
- Panel demo / superficies elevadas: `#0e0e11`
- Textura rayada demo: `repeating-linear-gradient(45deg,#131317 0 11px,#0e0e11 11px 22px)`
- Acento (lima): `#b8e832`; acento hover: `#cff05a`
- Bordes: `#24242a` (default), `#2b2b31` (chips/botones), `#1a1a1e` y `#17171b` (divisores sutiles), `#3a3a42` (hover)
- Texto: `#f4f4f6` (títulos), `#ededf0` (fuerte), `#cfcfd5` / `#a9a9b1` / `#9c9ca4` (cuerpo), `#78787f` / `#6f6f78` / `#6c6c74` / `#5f5f66` (muted/mono), `#cdd3c0` (mono verdoso)
- Nodos diagrama: borde raíz `#d8d8d8`, activo `#b8e832`, secundario `#6a6a72`/`#a9a9b1`; conector `#3a3a40`

**Tipografía**
- Sans: **Inter** (400/500/600/700/800). Mono: **JetBrains Mono** (400/500/600).
- Escala 4a: nombre 18px/800; repo/tab 13px mono; posicionamiento 12.5px/1.5; cuerpo trayectoria 11px/1.45; labels mono uppercase 10px `letter-spacing:.14em`; nodos diagrama 12-13px mono; micro 9.5-10px mono.

**Radios**: 9px (nodos diagrama), 7px (botones), 999px (chips). (4a no usa esquinas redondeadas grandes — es full-bleed.)
**Espaciado**: paddings 14/20/22/24/26px; gaps 7/9/10/14/16/18/20/24px.
**Sombra**: ninguna en el contenedor (full-bleed). Reservar sombras para overlays si hicieran falta.

## Assets
- **Fuentes**: Inter y JetBrains Mono (Google Fonts), mismos pesos.
- **Sin imágenes/íconos** en el provisional. Placeholders a reemplazar:
  - Iframe de **demo físico** por proyecto (WASM/canvas jugable), panel derecho.
  - **Explorador de arquitectura** navegable (el flowchart real del usuario), panel izquierdo.
- CV en PDF y URLs reales de GitHub/email pendientes de conectar.

## Files
- `Portafolio provisional.dc.html` — prototipo (incluye 4a aprobado + opciones históricas 3a/2a/1a/1b). **Referenciar solo la sección con id `4a`.** El resto es exploración previa.
- Nota: ignorar `support.js` y la sintaxis `<x-dc>`/`sc-if`/`{{ }}` — runtime del prototipo, no del portafolio.

## Target codebase
Portafolio real en **Astro**, tema oscuro. Recrear 4a como componente(s) Astro respetando los tokens; el estado del selector puede ser una isla (React/Preact/Svelte/vanilla JS) o `<script>` cliente, según lo que ya use el proyecto. La regla de pausa de audio al hacer swap debe implementarse en el cliente.
