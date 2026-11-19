#!/usr/bin/env bash
# Cortes de las tomas de Tarija y de pasos usados en el video. Uso:
#   scripts/cortes.sh <video-tarija-1.mp4 (plaza)> <video-tarija-2.mp4 (loma)> <pexels-3999620.mov> <pexels-12510397.mov>
set -euo pipefail
mkdir -p public/tarija
enc(){ ffmpeg -v error -y -ss "$2" -t "$3" -i "$1" -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -movflags +faststart "public/tarija/$4"; }
enc "$2" 6.5 5.5 aerea.mp4
enc "$2" 0 4 parque.mp4
enc "$1" 0 6 plaza.mp4
enc "$1" 6.2 4.5 fuente.mp4
ffmpeg -v error -y -i "$3" -an -vf scale=1920:-2 -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -movflags +faststart public/tarija/pies-pov.mp4
ffmpeg -v error -y -i "$4" -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -movflags +faststart public/tarija/pies-gente.mp4
