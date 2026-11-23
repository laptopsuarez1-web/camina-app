#!/usr/bin/env bash
# Recortes para el teaser «Hay más por caminar»: cada toma ocupa solo la franja bajo el horizonte (1080 × 820).
# Uso: scripts/horizonte_cortes.sh <carpeta con los videos de Mixkit txNNNN.mp4>
set -euo pipefail
MK="$1"; mkdir -p public/hz
banda(){ # nombre origen inicio [posición x 0-1] [posición y 0-1]
  ffmpeg -v error -y -ss "$3" -t 1.6 -i "$2" -an -vf "scale=1080:820:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:820:(iw-1080)*${4:-0.5}:(ih-820)*${5:-0.5},unsharp=5:5:0.4:5:5:0,fps=30,format=yuv420p" -c:v libx264 -preset medium -crf 17 "public/hz/$1.mp4"
}
banda tierra-noche "$MK/tx45033.mp4" 6 0.5 0.7
banda dunas "$MK/tx4149.mp4" 3 0.5 0.6
banda tela-verde "$MK/tx40229.mp4" 4
banda hojas "$MK/tx1886.mp4" 2
banda costa "$MK/tx51502.mp4" 4
banda tela-amarilla "$MK/tx40227.mp4" 4
banda cafe "$MK/tx4982.mp4" 6
banda olas "$MK/tx1164.mp4" 5
banda fuego "$MK/tx52304.mp4" 4 0.5 0.8
banda pasto "$MK/tx7853.mp4" 4 0.5 0.8
banda tinta "$MK/tx44818.mp4" 5
banda girasoles "$MK/tx4881.mp4" 6 0.5 0.7
banda burbujas "$MK/tx182.mp4" 5
banda canon "$MK/tx41401.mp4" 8
banda tierra-dia "$MK/tx46148.mp4" 5
banda tela-naranja "$MK/tx40226.mp4" 4
banda arena "$MK/tx1925.mp4" 8
banda rayos "$MK/tx9582.mp4" 6 0.5 0.3
banda olas-aereas "$MK/tx48525.mp4" 8
banda sol-mar "$MK/tx6734.mp4" 6 0.5 0.6
# tomas propias (Tarija y Bolivia)
banda tarija-aerea public/yasi/v/aerea.mp4 0.3 0.5 0.35
banda pasos public/yasi/v/pov.mp4 0 0.5 0.6
banda fuente public/yasi/v/fuente.mp4 0.2 0.5 0.75
