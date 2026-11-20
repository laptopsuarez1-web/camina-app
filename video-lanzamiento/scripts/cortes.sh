#!/usr/bin/env bash
# Tomas verticales (1188×2112, un poco más grandes que el cuadro para el movimiento de cámara sin perder nitidez).
# Uso: scripts/cortes.sh <Tarija-Bolivia-4K loma (YouTube, con permiso)> <Tarija-Bolivia-4K plaza> <pexels-3999620.mov>
set -euo pipefail
mkdir -p public/tarija/v
cut(){ ffmpeg -v error -y -ss $3 -t $4 -i "$2" -an -vf "crop=ih*9/16:ih:(iw-ih*9/16)*$5:0,scale=1188:2112:flags=lanczos,unsharp=5:5:0.7:5:5:0,fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 14 -movflags +faststart public/tarija/v/$1.mp4; }
cut aerea "$1" 8.0 2.4 0.5        # Loma de San Juan desde el aire
cut ciudad "$1" 11.0 1.15 0.5     # vista amplia antes del cierre
cut gente-plaza "$2" 2.55 1.5 0.5  # Plaza Luis de Fuentes con gente
cut fuente "$2" 9.0 2.3 0.5       # fuente de la plaza
cut pov "$3" 0.5 1.6 0.5          # pasos (Pexels, licencia libre)
