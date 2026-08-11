# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Fuente de verdad

**Al inicio de cada sesión, lee este archivo antes de cualquier otra cosa:**

```
/Users/jesus/Documents/Obsidian Vault/Proyectos/Portafolio.md
```

Ahí está el contexto del sitio web de portfolio: narrativa, estado actual, roadmap de mejoras y decisiones de diseño. Es la fuente de verdad sincronizada entre dispositivos.

## Comandos

```bash
npm run dev       # Dev server en localhost:4321
npm run build     # Build de producción → ./dist/
npm run preview   # Preview del build
```

## Arquitectura

Astro 6, static site. Todo el portfolio vive en `src/pages/index.astro` — HTML, CSS y contenido en un solo archivo. Sin componentes separados ni layouts por ahora.
