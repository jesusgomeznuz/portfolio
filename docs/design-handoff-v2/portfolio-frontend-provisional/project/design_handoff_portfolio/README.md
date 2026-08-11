# Handoff: Portafolio — layout provisional (opción 3a, "una sola pantalla / horizontal")

## Overview
Portafolio personal de **Juan Jesús Gómez Núñez**, physics & gameplay programmer (Rust · Bevy · Rapier · C#/Unity), buscando trabajo remoto júnior-medio en UK/EU. El objetivo del sitio es comunicar en un solo vistazo: (1) quién es y su posicionamiento, (2) su trayectoria narrativa (canicas virales → Jammable/Londres → engine propio), y (3) un explorador interactivo de sus 3 proyectos técnicos, cada uno con un **demo físico** y un **explorador de arquitectura de código** en el mismo formato fijo.

El layout elegido es **3a**: todo cabe en un viewport de laptop (~1360×800), sin scroll de "feed de celular". Columna izquierda = identidad + trayectoria; columna derecha = workbench interactivo de proyectos.

## About the Design Files
El archivo incluido (`Portafolio provisional.dc.html`) es una **referencia de diseño creada en HTML** — un prototipo que muestra el look y el comportamiento pretendidos, **no código de producción para copiar tal cual**. El HTML usa un runtime propio (`support.js`, plantillas `<x-dc>` / `sc-if`) que **no debe portarse**; es solo el andamiaje del prototipo.

La tarea es **recrear este diseño en el entorno del portafolio real** (el usuario trabaja en **Astro**), usando sus patrones y librerías establecidas. El prototipo contiene **3 opciones** apiladas (3a arriba, luego 2a, luego 1a/1b); **solo 3a es la dirección aprobada** — las demás son historial de exploración y pueden ignorarse.

## Fidelity
**Baja fidelidad (lofi) intencional**, pero con **colores y tipografía reales** ya definidos. Es un layout provisional "para trabajar mientras se termina el contenido". El desarrollador debe:
- Respetar la **estructura, jerarquía y proporciones** (esto es lo validado).
- Respetar los **tokens de color y tipografía** listados abajo (son los definitivos de la marca).
- Tratar los rellenos rayados (demos) y los diagramas de cajas (arquitectura) como **placeholders** — se reemplazan por iframes/embeds reales más adelante.
- No tratar micro-espaciados como pixel-perfect; el pulido fino llega en la fase de diseño final.

## Screens / Views

### Vista única — Landing horizontal (3a)
- **Nombre**: Home / landing (single-page, sin rutas).
- **Propósito**: El visitante entiende de inmediato quién es Juan y explora sus proyectos (demo + código) sin esfuerzo cognitivo ni scroll.
- **Layout general**: Tarjeta contenedora de **1360×800 px** (`max-width:100%`), `border:1px solid #24242a`, `border-radius:14px`, `overflow:hidden`, fondo `#0c0c0e`, `box-shadow:0 30px 60px -30px rgba(0,0,0,.8)`. Estructura vertical en 2 bloques:
  1. **Header** (barra superior, altura por contenido ~62px).
  2. **Main** (`flex:1`, `display:grid; grid-template-columns:372px 1fr`) — columna izquierda fija de 372px + columna derecha fluida.

#### Header
- `display:flex; align-items:center; justify-content:space-between; gap:24px; padding:20px 32px; border-bottom:1px solid #1a1a1e; flex-wrap:wrap`.
- **Izquierda** (fila baseline, `gap:16px`):
  - Nombre: `Juan Jesús Gómez Núñez` — Inter 800, 20px, color `#f4f4f6`, `letter-spacing:-.02em`.
  - Rol: `Physics & gameplay programmer` — Inter 600, 13px, color acento `#b8e832`.
  - Ubicación: `México · remoto UK / EU` — JetBrains Mono 400, 11px, color `#78787f`.
- **Derecha** (fila, `gap:10px`):
  - Stack: `Rust · Bevy · Rapier · C#/Unity` — JetBrains Mono 400, 11px, `#78787f`.
  - Botón **Email** (primario): `padding:8px 15px; background:#b8e832; color:#0c0c0e; border-radius:8px`, Inter 600 12px.
  - Botones **GitHub** y **CV** (secundarios): `padding:8px 15px; border:1px solid #2b2b31; border-radius:8px; color:#ededf0`, Inter 600 12px.

#### Columna izquierda — Identidad + trayectoria
- `border-right:1px solid #1a1a1e; padding:30px; display:flex; flex-direction:column; overflow:hidden`.
- **Posicionamiento** (párrafo): Inter 400, 15px/1.55, color `#cfcfd5`. Texto exacto:
  > "No soy otro dev pidiendo trabajo. Construí algo que se volvió viral por mi cuenta — y una startup de Londres me contrató para reconstruirlo a escala de producción."
- **Chips de credibilidad** (fila, `gap:8px`, `margin-top:18px`): pills `padding:5px 10px; border:1px solid #2b2b31; border-radius:999px`, JetBrains Mono 600 10px.
  - `Ex-Jammable · Londres` (texto en acento `#b8e832`).
  - `videos virales` (texto `#b7b7bf`).
- **Título de sección**: `La trayectoria` — JetBrains Mono 600, 11px, `letter-spacing:.14em; text-transform:uppercase`, color `#6f6f78`, `margin:30px 0 18px`.
- **Tres actos** (cada uno grid `34px 1fr; gap:14px`, separados por `border-bottom:1px solid #17171b`, padding vertical 16px):
  - Número (`01`/`02`/`03`): JetBrains Mono 800, 18px, acento `#b8e832`.
  - Título: Inter 700, 14px, `#ededf0`. Cuerpo: Inter 400, 12.5px/1.5, `#9c9ca4`.
  - **01 · Origen — canicas virales**: "Descubrí solo el método viral con simulaciones en Rust. Empecé a hacer videos por mi cuenta."
  - **02 · Jammable — Londres**: "Engine completo con Rapier + Rust: física local (sin cloud), renders on-device. Mi método, viral a escala en un producto real."
  - **03 · Engine propio**: "Fui más profundo: `rapier-bevy` + dos juegos." + call-to-action inline "Explóralos →" en acento `#b8e832`. (`rapier-bevy` va en JetBrains Mono 11.5px color `#cdd3c0`.)

#### Columna derecha — Workbench de proyectos
- `padding:26px 30px; display:flex; flex-direction:column; min-height:0`.
- **Encabezado** (fila baseline): título `Los proyectos` (mismo estilo mono uppercase que arriba) + nota derecha "Mismo formato siempre: demo · arquitectura. Cambiá sin reaprender." (Inter 400, 11px, `#6f6f78`).
- **Selector de 3 tarjetas** (`display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px`):
  - Cada tarjeta: `cursor:pointer; border:1px solid #24242a; border-radius:10px; overflow:hidden; background:#0e0e11`. Hover: `border-color:#3a3a42`.
  - Barra superior de 3px que se pinta en acento `#b8e832` **solo en la tarjeta activa** (indicador de selección).
  - Contenido (`padding:11px 14px`): nombre en JetBrains Mono 600 12px `#ededf0` + subtítulo JetBrains Mono 400 10px `#78787f`.
  - Tarjetas: `canicasbrawl` ("demo · arquitectura"), `musical-path` ("arquitectura"), `rapier-bevy` ("demo · engine").
- **Visor** (`flex:1; min-height:0; margin-top:14px; border:1px solid #24242a; border-radius:12px; overflow:hidden`): muestra **un solo proyecto a la vez** según la tarjeta seleccionada. Cada visor tiene:
  - **Barra de título** (`padding:14px 18px; border-bottom:1px solid #1a1a1e`, fila space-between): nombre del repo (JetBrains Mono 600 14px, acento `#b8e832`) + descripción corta (Inter 400 12.5px `#9c9ca4`) a la izquierda; link `GitHub ↗` (JetBrains Mono 500 12px, acento) a la derecha.
  - **Cuerpo split** (`flex:1; display:grid; grid-template-columns:1fr 1fr; gap:1px; background:#1a1a1e`):
    - **Izquierda = demo físico** (placeholder): fondo `#0e0e11` con textura rayada `repeating-linear-gradient(45deg,#131317 0 9px,#0e0e11 9px 18px)`. Aquí va el **iframe del demo** (WASM/canvas). Etiqueta placeholder: "demo físico / iframe embebido →".
    - **Derecha = explorador de arquitectura** (placeholder): fondo `#0a0a0c`, diagrama de cajas centrado representando el flujo de código (nodo `main.rs` → hijos como `physics`/`render`, `path`/`audio`). Cajas: `border:1.5px solid`, `border-radius:8px`, `padding:5px 13px`, JetBrains Mono 500 11px. El nodo activo/entrada va en acento `#b8e832`; los secundarios en gris `#6a6a72`/`#a9a9b1`; conectores = línea 1px `#3a3a40`. Etiqueta: "explorador de arquitectura / clic para navegar el flujo →".
  - **Excepción `rapier-bevy`**: su visor es solo demo físico a todo el ancho (sin split), porque es el engine base.

## Interactions & Behavior
- **Swap de proyecto (clave)**: clic en una de las 3 tarjetas cambia el visor. **Formato fijo**: demo siempre a la izquierda, arquitectura siempre a la derecha, en el mismo lugar — así el visitante no "reaprende" cómo explorar cada proyecto. La barra de 3px de la tarjeta activa se pinta en acento.
- **Regla de audio (importante para la fase final)**: como solo se muestra un proyecto a la vez, **el demo no visible debe pausarse** y solo suena el que está enfrente. Esto elimina sonidos superpuestos / la sensación de "no controlar" reproducciones. Al hacer swap: pausar/silenciar el iframe saliente, reanudar/activar el entrante.
- **Sin scroll**: todo el contenido cabe en el viewport de laptop. Nada de scroll largo tipo feed.
- **Hover**: tarjetas de proyecto aclaran su borde (`#24242a` → `#3a3a42`). Links en acento aclaran a `#cff05a`.
- **Explorador de arquitectura**: se pretende **navegable** (clic en nodos para recorrer el flujo del código). En el prototipo es estático — implementar la navegación real en la fase final.
- **CTAs**: Email (mailto), GitHub y CV (PDF) en el header; link GitHub por proyecto.

## State Management
- `selectedProject`: `'canicas' | 'musical' | 'rapier'` (default `'canicas'`). Único estado de la vista; controla qué visor se muestra y qué tarjeta marca la barra de acento.
- Al cambiar: pausar el media del proyecto anterior, activar el del nuevo (ver regla de audio).
- Sin data fetching por ahora; demos y explorador se cargan como iframes/embeds locales cuando estén listos.

## Design Tokens
**Colores**
- Fondo página (fuera de la tarjeta): `#08080a`
- Superficie principal / tarjeta: `#0c0c0e`
- Superficies elevadas / paneles: `#0a0a0c`, `#0e0e11`
- Textura rayada demo: `repeating-linear-gradient(45deg,#131317 0 9px,#0e0e11 9px 18px)`
- Acento (lima): `#b8e832`; acento hover: `#cff05a`
- Bordes: `#24242a` (default), `#2b2b31` (chips/botones), `#1a1a1e` y `#17171b` (divisores sutiles), `#3a3a42` (hover)
- Texto: `#f4f4f6` (títulos), `#ededf0` (fuerte), `#cfcfd5` / `#a9a9b1` / `#9c9ca4` (cuerpo), `#78787f` / `#6f6f78` / `#6c6c74` / `#5f5f66` (muted/mono), `#cdd3c0` (mono verdoso)
- Nodo diagrama neutro: borde `#d8d8d8`/`#6a6a72`, conector `#3a3a40`

**Tipografía**
- Sans: **Inter** (400/500/600/700/800). Mono: **JetBrains Mono** (400/500/600).
- Escala usada: nombre 20px/800; título proyecto 14px mono; posicionamiento 15px/1.55; cuerpo trayectoria 12.5px/1.5; labels mono uppercase 11px `letter-spacing:.14em`; micro-labels 10–11px mono.

**Radios**: 14px (tarjeta contenedora), 12px (visor), 10px (tarjetas/paneles), 8px (botones/nodos), 999px (chips).
**Sombra**: `0 30px 60px -30px rgba(0,0,0,.8)`.
**Espaciado**: paddings principales 20/26/30/32px; gaps 8/10/12/14/16/24px.

## Assets
- **Fuentes**: Inter y JetBrains Mono (Google Fonts). Usar los mismos pesos en el codebase.
- **Sin imágenes/íconos** en el provisional. Placeholders a reemplazar en fase final:
  - Iframe(s) de **demo físico** por proyecto (WASM/canvas del juego).
  - **Explorador de arquitectura** navegable (embed o componente propio).
- CV en PDF y URLs reales de GitHub/email pendientes de conectar.

## Files
- `Portafolio provisional.dc.html` — prototipo (incluye 3a aprobado + opciones históricas 2a/1a/1b). **Referenciar solo la sección con id `3a`.** El resto es exploración previa.
- Nota: ignorar `support.js` y la sintaxis `<x-dc>`/`sc-if`/`{{ }}` — son del runtime del prototipo, no del portafolio.

## Target codebase
El portafolio real está en **Astro** (tema oscuro). Recrear 3a como componente(s) Astro respetando los tokens de arriba; el estado del selector puede ser una isla (React/Preact/Svelte/vanilla JS) o `<script>` del lado cliente, según lo que ya use el proyecto.
