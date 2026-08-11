#!/usr/bin/env bash
# Convierte una captura cualquiera (mov de QuickTime, mp4 del --record del
# juego, gif) en el clip que el visor sabe reproducir.
#
#   ./scripts/clip.sh entrada.mov spawn-marbles
#   ./scripts/clip.sh entrada.mov spawn-marbles 4 2.5   # recorta desde 4s, dura 2.5s
#
# Deja public/flow-media/<nombre>.webm y te imprime la línea que hay que pegar
# en el overlay. WebM/VP9 y no GIF porque el mismo clip de 3s pesa ~150 KB en
# vez de 2-4 MB, y sin el techo de 256 colores.
set -euo pipefail

SRC=${1:-}
NAME=${2:-}
START=${3:-0}
DUR=${4:-}

if [[ -z "$SRC" || -z "$NAME" ]]; then
  echo "uso: $0 <archivo-fuente> <nombre-del-clip> [inicio-seg] [duracion-seg]" >&2
  exit 1
fi
[[ -f "$SRC" ]] || { echo "no existe: $SRC" >&2; exit 1; }

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/flow-media"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/$NAME.webm"

# 440px de ancho / crf 46: el preview se muestra a ~250 CSS px, así que esto
# cubre retina sin pagar de más — a ese tamaño es indistinguible de crf 36 y
# pesa la mitad. Altura par (yuv420p la exige).
TRIM=(-ss "$START")
[[ -n "$DUR" ]] && TRIM+=(-t "$DUR")

ffmpeg -y -loglevel error "${TRIM[@]}" -i "$SRC" \
  -vf "fps=24,scale=440:-2:flags=lanczos" \
  -c:v libvpx-vp9 -b:v 0 -crf 46 -row-mt 1 -an \
  -pix_fmt yuv420p "$OUT"

SIZE=$(du -h "$OUT" | cut -f1 | tr -d ' ')
echo "✓ $OUT  ($SIZE)"
echo
echo "  pégalo en src/data/flow-viewer-overlay.json, en el nodo que toque:"
echo "      \"media\": \"/flow-media/$NAME.webm\""
