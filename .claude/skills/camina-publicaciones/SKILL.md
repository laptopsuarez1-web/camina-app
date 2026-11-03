---
name: camina-publicaciones
description: Reglas de marca para diseñar publicaciones, flyers, stories y videos de Camina (Instagram y otras redes). Úsala siempre que se pida una pieza gráfica o de video para Camina.
---

# Publicaciones de Camina

Camina es una app de Bolivia (piloto en Tarija): la gente camina, gana Puntos y los canjea en comercios locales.

## Reglas obligatorias
- Español, sin voseo. Se dice "zona", no "barrio".
- **Sin personas** por ahora (ni fotos ni ilustraciones de gente).
- **Sin la mascota Baifo**, en ninguna pieza.
- **Nunca redibujar la moneda de Puntos.** Usar `apps/mobile/assets/camina-coin.png`.
- Moneda dorada (`camina-coin-gold.png`) y borde dorado: solo para el plan Paso Adelante.
- Íconos simples, no brillantes. Pasito (otra app) es solo inspiración, no se copia.
- No inventar premios, comercios, precios ni cifras. Si falta un dato, preguntar.
- Look: vidrio, anillo aqua, monedas, fondo perlado. Mantener el estilo actual de la app.

## Colores (de `apps/mobile/src/theme/tokens.ts`)
- Aqua `#4FC3A8`, aqua oscuro `#1F7A66`, mint `#7FEDC4`
- Morado `#8B4FD1`, morado suave `#C9ADF5`, morado oscuro `#5B31A3`
- Claro: fondo `#F7F3FC`, tarjeta `#FFFFFF`, texto `#291C47`
- Oscuro: fondo `#16101F`, tarjeta `#221933`, texto `#F0EBFA`
- Degradé de cabecera: `#3a2668` → `#1c1030` → `#120a1e`
- El texto debe tener contraste suficiente (mínimo 4,5:1).

## Tipografía
- Títulos: Montserrat Black (`apps/mobile/assets/fonts/Montserrat_900Black.ttf`)
- Texto: Plus Jakarta Sans (400 a 800, misma carpeta)

## Recursos
- **Logo oficial (usar SIEMPRE, sin pedir permiso):** `apps/partner/public/marca/logo-con-nombre-transparente.png` (círculo con pies + palabra CAMINA, transparente, 1400×1500). Variantes: `logo-solo-transparente.png`, `logo-solo-morado.png`, `nombre-camina-transparente.png`.
- `logo-mint.png` y `camina-coin.png` son la moneda de Puntos, NO el logo oficial. La moneda solo se usa para representar Puntos.
- Pies: `pie-izq-aqua.png`, `pie-der-aqua.png`, `pie-izq-mint.png`, `pie-der-mint.png`
- Capturas reales de la app: preferirlas a maquetas inventadas.

## Formatos
- Feed de Instagram: 1080×1350 (4:5)
- Stories y Reels: 1080×1920 (9:16)
- Margen de seguridad en stories: 250 px arriba y abajo.
- Una idea por pieza, poco texto, un solo llamado a la acción.

## Proceso
1. Mostrar la propuesta en modo oscuro antes de darla por final.
2. Entregar PNG (y video MP4 si aplica), más el texto del caption.
3. Después de cada ronda, un PDF antes/después (claro y oscuro).
4. Nunca decir "listo" sin verificar el resultado. Si algo no se pudo probar, decirlo.
5. Herramientas: conectores de Canva y Figma si están activos; si no, HTML renderizado con Playwright.
