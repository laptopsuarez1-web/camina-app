# CAMINA · Video oficial de lanzamiento

**Concepto:** TARIJA SE MUEVE → CADA PASO CUENTA → CAMINA · CAMINÁ Y GANÁ · MUY PRONTO
**Formato:** vertical 1080 × 1920 (Reels, TikTok, Facebook), 35 s, 30 fps. Dos versiones de audio:
- **A · sin voz** (`out/Camina-lanzamiento-sin-voz.mp4`): música y efectos.
- **B · con voz** (`out/Camina-lanzamiento-con-voz.mp4`): música, efectos y locución en español latino neutro.

**Cómo está hecho:** con código ([Remotion](https://www.remotion.dev), React). Cada escena es un componente en `src/Lanzamiento.tsx`; cambiar un texto o un tiempo y volver a exportar lleva minutos.

## 1. Guion (tal como está armado)

| Seg. | Escena | Imagen | Texto en pantalla | Locución (versión B) |
|---|---|---|---|---|
| 0–5 | 01 Tarija se mueve | Tomas reales de Tarija (con permiso del autor): Loma de San Juan desde el aire → Plaza Luis de Fuentes con gente → la fuente. Cortes en el ritmo. | **TARIJA / SE MUEVE** | «Hay una nueva forma de moverte» |
| 5–10 | 02 Cada paso cuenta | El logo aparece con un reflejo de luz y vuela hasta el teléfono, que lo recibe como pantalla de bienvenida y pasa al Inicio real. | **CADA PASO / CUENTA** | «Cada paso cuenta» |
| 10–16 | 03 Sumá puntos | Inicio en vivo: los pasos suben con suavidad de 1.620 a 2.000 y el aro se completa; recién entonces sale «+1 Punto», la moneda vuela al saldo (247 → 248) y el aro vuelve a empezar. Después, Actividad y Tus Puntos (saldo 248). | **SUMÁ / PUNTOS** · 1.000 pasos = 1 Punto (regla real) | «Camina, acumula puntos y disfruta beneficios» |
| 16–23 | 04 Disfrutá beneficios | Mapa de comercios → lista de canjes: Fripap's primero (las monedas van a su premio), baja a Bloom → «Pídele al local su código» → «¡Canje confirmado!». | **DISFRUTÁ / BENEFICIOS** | — |
| 23–29 | 05 Hay mucho más | Pasos en primera persona (1 s) → una pantalla por vez, al ritmo: Ruta del mes, Grupos y chat, Ranking semanal, Tu perfil e insignias → vista amplia de Tarija (1 s). | **HAY MUCHO / MÁS** + nombre de cada función | «Tus pasos pueden llevarte más lejos» |
| 29–35 | 06 Cierre | Logo con reflejo y aro blanco que se abre (sin brillos verdes). | **CAMINA** · **CAMINÁ Y GANÁ** · **MUY PRONTO** · Muy pronto en App Store / Google Play · caminaapp.com | «Camina» |

Del segundo 5 al 23 el teléfono es uno solo: no hay cortes ni saltos, cambian las pantallas y la cámara acompaña cada escena.

**Reglas que respeta:** pantallas reales de la app con datos de ejemplo (Valentina, nombres inventados, sin fotos de personas); ningún premio, comercio ni descuento inventado; textos sin puntos finales; la app todavía no está publicada, así que App Store y Google Play aparecen como «Muy pronto en», sin los distintivos oficiales de descarga.

## 2. Recursos usados y su origen

| Recurso | Archivo | Origen / licencia |
|---|---|---|
| Loma de San Juan, plaza, fuente, vista amplia | `public/tarija/v/{aerea,gente-plaza,fuente,ciudad}.mp4` | Video «Tarija Bolivia 4K» de YouTube, **con permiso del autor** (confirmado por Camina). Cortadas en vertical con `scripts/cortes.sh`, a más resolución que el cuadro para que se vean nítidas. |
| Pasos en primera persona | `public/tarija/v/pov.mp4` | Pexels 3999620 (licencia libre, uso comercial). |
| Pantallas de la app | `public/app/*` | Capturas reales de la app oficial. Ruta, Ranking y Perfil se limpian con `scripts/pantallas.py`; el saldo de Actividad y Tus Puntos (248) con `scripts/pantallas3.py`. |
| Logo, huellas, moneda | `public/marca/*`, `public/app/camina-coin.png` | Archivos oficiales de Camina. |
| Música y efectos | `public/audio/musica.wav`, `sfx.wav` | **Originales, generados por código** (`scripts/sonido.py`): electrónica cinematográfica a 120 BPM que crece en 5 partes. Sin muestras ni derechos de terceros: uso comercial libre. |
| Locución | `public/voz/01–05.wav` | Kokoro (modelo abierto, licencia Apache 2.0, uso comercial permitido), voz `ef_dora` con fonética latinoamericana (`es-419`): `scripts/voz.py`. |
| Íconos de Apple y Google Play | en `src/Lanzamiento.tsx` | Simple Icons (CC0). |
| Tipografías | `public/fonts/*` | Mona Sans (OFL) y Plus Jakarta Sans (OFL), las de la web y la app. |

Los videos y el audio no se suben a GitHub (pesan mucho). Para regenerarlos: los cortes de Tarija con `scripts/cortes.sh`; la voz con `python3 scripts/voz.py <carpeta-de-kokoro>`; la música, los efectos y las mezclas con `python3 scripts/sonido.py`.

## 3. Exportar

```bash
npm i
npx remotion render Lanzamiento out/video.mp4 --crf=16 --audio-codec=aac --audio-bitrate=320k
# audio final a −14 LUFS (Instagram, TikTok, Facebook): se reemplaza la pista por cada mezcla normalizada
for v in sin-voz con-voz; do
  ffmpeg -i out/video.mp4 -i public/audio/mezcla-$v.wav -map 0:v -map 1:a -c:v copy \
    -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 320k -shortest -movflags +faststart out/Camina-lanzamiento-$v.mp4
done
```
Para ver y retocar en el navegador: `npx remotion studio`.

## 4. Qué mejoraría el video (necesita material o herramientas de afuera)

1. **Grabaciones de pantalla nuevas y limpias** (prioridad): hoy las pantallas son capturas fijas con movimiento agregado. Con grabaciones reales la demo se ve aún más viva. Cómo grabarlas:
   - iPhone: Ajustes → Centro de control → agregar «Grabación de pantalla». Modo oscuro activado, brillo al máximo, sin notificaciones (modo No molestar).
   - Usar una **cuenta de prueba con datos de ejemplo** (nunca la de una persona real).
   - Grabar cada recorrido por separado, despacio, 6–8 s cada uno: (A) abrir la app → Inicio; (B) Inicio → Actividad (tocar 7 días / 30 días); (C) Inicio → saldo de Puntos → Tus Puntos; (D) Canjes → mapa → tocar un comercio → su premio; (E) Canjear → escribir el código del local → «¡Canje confirmado!».
   - Mandar los archivos tal cual (.mov). La barra de estado (hora, batería) se tapa en edición, dejando la isla dinámica.
2. **Tomas propias de Tarija**: atardecer en la Plaza, calle La Madrid, San Jacinto, Miraflores, de noche. Celular en horizontal, 4K o 1080p, 5–10 s, cámara quieta o caminando lento.
3. **Tomas de personas**: amigos caminando juntos, gente corriendo, alguien mirando el celular en la calle (en Tarija, con permiso de quienes aparecen). Hoy solo hay gente en la plaza (de lejos) y pasos en primera persona.

### Prompts para Kling AI (tomas de apoyo de 3–5 s)

Usar solo como **apoyo** (texturas, detalles), nunca para «inventar» Tarija: los lugares reconocibles tienen que ser tomas reales. Mismas reglas en todos: *cinematic, 24 fps feel, warm natural color grade, shallow depth of field, no text, no logos, no faces in close-up, realistic.*

1. **Cordones** (escena 02): «Close-up of hands tying the laces of white running sneakers on a stone sidewalk, morning golden light, slow push-in, shallow depth of field, 4 seconds, vertical 9:16. Avoid: brand logos, faces.»
2. **Pisada en cámara lenta** (escena 02): «Low-angle shot at ground level, a sneaker steps onto a colonial cobblestone street, slow motion, dust particles in warm sunlight, camera static, 3 seconds. Avoid: crowds, text.»
3. **Sombras caminando** (escena 02): «Top-down shot of two long shadows of people walking on a sunlit sidewalk at sunset, steady drone-like movement following them, 4 seconds. Avoid: faces, cars.»
4. **Celular en la mano** (escena 03, sin pantalla visible): «A hand takes a black smartphone out of a jeans pocket while walking on a tree-lined street, screen facing away from camera, warm afternoon light, tracking shot, 3 seconds. Avoid: visible screen content, logos.» (La pantalla real se pone después en edición.)
5. **Atardecer de valle** (escena 07, si no hay toma real): «Wide aerial shot slowly moving forward over a green valley with low mountains at golden hour, warm haze, 5 seconds. Avoid: buildings that look European, skyscrapers, text.»

## 5. Guía de edición en CapCut (si se quiere retocar a mano)

Partir del video exportado (`Camina-lanzamiento-sin-voz.mp4` o `-con-voz.mp4`) y trabajar encima; ya trae cortes, textos y animaciones.
- **0:00–0:04** Si hay una toma propia de Tarija mejor que la aérea, ponerla en una pista superior con la misma duración. Mantener «TARIJA SE MUEVE» encima (copiar desde el video).
- **0:04–0:08** Reemplazar una de las tres tomas por «Cordones» o «Pisada» de Kling si quedan bien. Cortes en cada golpe de la música (0:04, 0:05.3, 0:06.6).
- **0:08–0:27** No tocar las pantallas: son la parte que explica la app. Si se agregan grabaciones nuevas, recortarlas al tamaño exacto de la pantalla del teléfono (usar «Máscara → Rectángulo» con esquinas redondeadas) y respetar los tiempos de cada paso.
- **0:27–0:35** Dejar el cierre tal cual (logo original, sin efectos de CapCut).
- **Música:** silenciar la pista original y poner la pista con licencia; hacer coincidir su golpe fuerte con **0:30** (aparición del logo) y su subida con **0:24–0:27**. Mantener los efectos (pasos, monedas, confirmación) en una pista aparte al 70 %.
- **Exportar:** 1080p, 30 fps, «Tasa de bits: Recomendada» o más alta.

## 6. Música: alternativa con licencia

La pista incluida es original y libre de derechos (uso comercial sin restricciones). Si se quiere una producción de estudio, buscar en Epidemic Sound, Artlist o Musicbed una pista **electrónica cinematográfica optimista de 118–122 BPM** con entrada de ritmo cerca de 0:08, subida a 0:27 y golpe a 0:29; guardar el comprobante de licencia y conservar los efectos (`sfx.wav`) en una pista aparte.

## 7. Texto para publicar

**Instagram / Facebook**
> Tarija ya camina. Ahora, cada paso cuenta. 👟
> Camina cuenta tus pasos y los convierte en Puntos para canjear por beneficios en comercios de tu ciudad.
> Muy pronto en App Store y Google Play. Avisame en caminaapp.com
> #Tarija #TarijaBolivia #CaminaApp #Caminar

**TikTok**
> ¿Caminar y ganar en Tarija? Ahora sí 👟 #Tarija #CaminaApp #Bolivia

## 8. Control de calidad

- [x] Tarija reconocible (Plaza Luis de Fuentes, Loma de San Juan) con tomas reales y con permiso.
- [x] Pantallas reales de la app, datos de ejemplo, sin datos personales.
- [x] Se entiende el funcionamiento en 3 pasos (Caminá → Sumá puntos → Disfrutá beneficios).
- [x] Colores oficiales (negro, morado #200A52, verde #62F0B6, blanco). Logo original sin deformar.
- [x] Sin promociones ni premios inventados; sin distintivos de tiendas (todavía no está publicada).
- [x] Textos dentro de la zona segura (márgenes de 90 px a los lados; nada importante abajo del todo, donde van los botones de Reels/TikTok).
- [x] Sin marcas de agua.
- [x] Textos sin puntos finales; voseo escrito de la marca (Sumá, Disfrutá, Caminá y ganá) y locución neutra con tuteo.
- [x] Música original con evolución en 5 partes y efectos sincronizados; audio a −14 LUFS.
- [x] Cierre sin elementos verdes sueltos; App Store y Google Play como «Muy pronto en».
- [ ] Grabaciones de pantalla nuevas (opcional, mejora la demo).
