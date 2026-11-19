---
name: Camina, portada caminaapp.com
description: Caminar por calles reales de Tarija hasta un premio real; morado y menta del logo sobre bases de blanco cálido y grafito, una sola familia ancha.
colors:
  plum: "#200a52"
  plum-2: "#2c1468"
  plum-3: "#3d2386"
  mint: "#62f0b6"
  mint-2: "#8af5c9"
  mint-ink: "#156650"
  mint-soft: "rgba(98, 240, 182, 0.15)"
  mint-light: "#e3f5f0"
  paper: "#f7f7f5"
  paper-2: "#edede8"
  paper-3: "#dcdcd6"
  ink: "#111318"
  ink-2: "#1a1c22"
  ink-3: "#252830"
  mut-plum: "#b4a9db"
  mut-ink: "#9a9ea8"
  mut-paper: "#5d616b"
  text-plum: "#ddd6f3"
  off-paper: "#8a8d95"
  off-paper-2: "#6b6f78"
typography:
  display:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(3.3rem, 7.6vw, 7.4rem)"
    fontWeight: 720
    lineHeight: 0.92
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 116"
  headline:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.35rem, 5vw, 4.9rem)"
    fontWeight: 680
    lineHeight: 0.98
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 116"
  headline-sm:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.8rem, 3.4vw, 2.9rem)"
    fontWeight: 680
    lineHeight: 1.02
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 116"
  title:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)"
    fontWeight: 680
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 116"
  lead:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.08rem, 1.3vw, 1.25rem)"
    fontWeight: 420
    lineHeight: 1.55
  body:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 420
    lineHeight: 1.6
  label:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    letterSpacing: "-0.005em"
  note:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 420
    lineHeight: 1.6
  numeral:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.25rem, 2.1vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 110"
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  sheet: "28px"
  pill: "999px"
spacing:
  gap-sm: "12px"
  gap-md: "24px"
  gap-lg: "48px"
  gap-xl: "64px"
  gap-2xl: "80px"
  gutter: "clamp(20px, 4.5vw, 56px)"
  section: "clamp(96px, 12vw, 184px)"
  head-bottom: "clamp(56px, 7vw, 104px)"
  container: "1280px"
components:
  button-primary-dark-field:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.plum}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  button-primary-dark-field-hover:
    backgroundColor: "{colors.mint-2}"
  button-primary-light-field:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.mint}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  button-primary-light-field-hover:
    backgroundColor: "{colors.plum-3}"
  button-ghost:
    backgroundColor: "transparent"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  button-sm:
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  nav:
    textColor: "{colors.paper}"
    height: "72px"
  nav-scrolled:
    backgroundColor: "{colors.plum}"
    height: "60px"
  dock:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "8px 8px 8px 18px"
  section-sheet:
    rounded: "{rounded.sheet}"
    padding: "{spacing.section} 0"
  card-plum:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "clamp(28px, 4vw, 56px)"
  card-ink:
    backgroundColor: "{colors.ink-2}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "clamp(28px, 4vw, 48px)"
  tabs:
    backgroundColor: "{colors.ink-3}"
    textColor: "{colors.mut-ink}"
    rounded: "{rounded.pill}"
    padding: "5px"
  tab-active:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.plum}"
    rounded: "{rounded.pill}"
    height: "44px"
  chip-dato:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.plum}"
    rounded: "{rounded.pill}"
    padding: "8px 16px 8px 12px"
  chip-dato-puntos:
    backgroundColor: "{colors.mint-light}"
    textColor: "{colors.mint-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 16px 8px 6px"
  pts-dark-field:
    backgroundColor: "{colors.mint-soft}"
    textColor: "{colors.mint}"
    rounded: "{rounded.pill}"
    padding: "3px 12px 3px 3px"
  pts-light-field:
    backgroundColor: "{colors.mint-light}"
    textColor: "{colors.mint-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 12px 3px 3px"
  chip-plus:
    backgroundColor: "#3c7867"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "3px 10px 3px 3px"
  map-board:
    backgroundColor: "{colors.plum-2}"
    rounded: "{rounded.lg}"
  readout:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.paper}"
    typography: "{typography.numeral}"
    padding: "6px"
  stamp-filled:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.plum}"
    rounded: "{rounded.pill}"
  route-stop:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    size: "clamp(36px, 5vw, 52px)"
  route-stop-on:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.plum}"
---

# Design System: Camina, portada caminaapp.com

> **Alcance.** Este sistema describe solo la portada pública (`/`), construida en `src/components/home/` y con todos sus tokens declarados en `home.css` bajo la clase raíz `.hm`. El resto de la app (el panel de comercios, `/comercios`, login, registro, legales) usa otros estilos (`globals.css`, Plus Jakarta Sans, temas claro/oscuro del panel) y queda fuera de este documento. No apliques estos tokens allí sin una decisión explícita.

## Overview

**Creative North Star: "Calles reales, premio real"**

La portada se lee como una caminata: arranca en un campo morado profundo (el morado del logo) donde un mapa real del centro de Tarija se recorre con huellas menta hasta la puerta de un comercio real, y termina en otro campo morado con una fila de huellas que cruza la pantalla. Entre esos dos campos, las secciones alternan blanco cálido y grafito, y cada una sube sobre la anterior como una hoja con las esquinas superiores redondeadas. La composición es editorial y tecnológica a la vez: titulares enormes y anchos, mucho aire, listas separadas por filetes finos en vez de tarjetas, y teléfonos con capturas reales como única ilustración.

El menta funciona como acción y como recompensa: es el botón sobre los campos oscuros, el color de los Puntos (que siempre llevan la moneda real de la app), de las huellas, de los sellos completos y del estado "Listo para canjear". Sobre el blanco cálido el menta no se usa como texto; allí la acción se invierte a una píldora morada con texto menta. Una sola familia tipográfica, Mona Sans variable, hace todo el trabajo: el eje de ancho expandido (116%) da la voz a los titulares y el ancho normal sostiene la lectura.

El movimiento es contenido y narrativo: los titulares se revelan línea a línea desde una máscara, un teléfono fijo cambia de pantalla según la etapa en "Cómo funciona", y el recorrido de la Ruta del mes se dibuja con el scroll. No hay brillos, vidrio, degradados ni desenfoques decorativos. Con "reducir movimiento" todo queda visible y quieto en su estado final.

**Key Characteristics:**
- Campos de marca morados en apertura y cierre; base alternada blanco cálido / grafito entre ellos.
- Menta = acción y recompensa; nunca texto sobre blanco.
- Una sola familia (Mona Sans), titulares anchos (wdth 116) con tracking negativo, texto en ancho normal.
- Secciones como hojas superpuestas (esquinas superiores de 28px), profundidad por tono y superposición.
- Huellas del logo como única grafía decorativa; iconos de trazo 1.75 redondeado solo donde algo no es texto.
- Los Puntos se muestran como en la app: la moneda real de Camina junto al número, en una pastilla menta.
- Teléfonos con capturas reales en modo oscuro como única imagen de producto.

## Colors

Dos colores de marca del logo (morado profundo y menta) sobre dos bases neutras (blanco cálido y grafito), con un tono de texto secundario propio para cada campo.

### Primary
- **Morado Huella** (`plum`): campo del héroe, del cierre, del menú móvil a pantalla completa, de la barra fija móvil y de los tableros de marca dentro de secciones claras (Tarjeta Camina, tablero de la Ruta). Sobre blanco es también el relleno del botón principal y el color de los textos de énfasis (cifras del contador de etapas, chip de dato).
- **Morado Calle** (`plum-2`): el fondo del mapa (héroe y Ruta), la celda de Puntos del contador, el anillo que separa los pines del mapa.
- **Morado Esquina** (`plum-3`): hover del botón morado, hover de las preguntas frecuentes y fondo de los números de paso de la Ruta.

### Secondary
- **Menta Premio** (`mint`): botón principal en campos morado y grafito, Puntos, huellas, recorrido dibujado, sellos llenos, pastilla activa de pestañas, estado "Listo para canjear", la última línea de los titulares del héroe y del cierre, el anillo de foco y la selección de texto.
- **Menta Claro** (`mint-2`): solo el hover del botón menta.
- **Menta Tinta** (`mint-ink`): el verde de texto de la propia app, para menta sobre fondos claros (6,4:1 sobre `paper`, 6,1:1 sobre `mint-light`): números de etapa, texto de las pastillas de Puntos en campos claros y borde del punto del chip de dato.
- **Menta Velo** (`mint-soft`): menta al 15% de opacidad, el fondo de la pastilla de Puntos sobre morado y grafito (la misma pastilla "mint/15" de la app).
- **Menta Agua** (`mint-light`): el fondo sólido de la pastilla de Puntos sobre blanco cálido y del chip de dato de la etapa "Sumas Puntos" (el "aqua-light" de la app).

### Neutral
- **Blanco Cálido** (`paper`): base de las secciones claras y texto principal sobre campos oscuros.
- **Blanco Piedra** (`paper-2`): fondo del chip de dato en "Cómo funciona".
- **Blanco Acera** (`paper-3`): riel de la línea de progreso y borde de los nodos inactivos de las etapas.
- **Grafito** (`ink`): base de las secciones oscuras y del pie; texto principal sobre blanco.
- **Grafito Alto** (`ink-2`): tarjeta "¿Tienes un comercio?" y la palabra CAMINA gigante del pie (relleno apenas visible).
- **Grafito Tercero** (`ink-3`): carril de las pestañas de Comunidad.
- **Lavanda Tenue** (`mut-plum`): texto secundario sobre morado (7,9:1).
- **Lavanda Lectura** (`text-plum`): texto de lectura más claro sobre morado (12,2:1): el lead del héroe y los pasos del tablero de la Ruta.
- **Gris Grafito** (`mut-ink`): texto secundario sobre grafito (6,9:1).
- **Gris Papel** (`mut-paper`): texto secundario sobre blanco (5,8:1).
- **Gris Apagado** (`off-paper`): titular de una etapa inactiva en "Cómo funciona" (3,1:1, solo en tamaño de titular grande).
- **Gris Apagado Texto** (`off-paper-2`): texto de una etapa inactiva (4,7:1).

Los filetes (`--line`) no son un color propio: cada campo define su línea translúcida (lavanda al 20% sobre morado, blanco al 10% sobre grafito, grafito al 12% sobre blanco).

### Named Rules
**The Two Fields Rule.** El morado como campo de sección completa aparece solo en la apertura (héroe) y el cierre (descarga). Entre ellos, las secciones alternan estrictamente blanco cálido y grafito; el morado vuelve dentro de ellas solo como tablero contenido (Tarjeta, Ruta, contador), nunca como sección.

**The Mint Is Earned Rule.** El menta marca lo que se gana o lo que se hace: botones, Puntos, huellas, sellos, rutas recorridas. No se usa para decorar, ni como texto sobre blanco (1,3:1). Sobre blanco el menta pasa a `mint-ink`, o la acción se invierte a píldora morada con texto menta.

**The Real Coin Rule.** Los Puntos siempre aparecen con la moneda real de la app (`/web/camina-coin.png`, el mismo archivo que usa la app móvil) junto al número, nunca con un icono dibujado, un punto o un símbolo. En lista o en línea van en la pastilla de Puntos (`mint-soft` con texto menta sobre campos oscuros, `mint-light` con texto `mint-ink` sobre claros).

**The Field Inherits Rule.** Los componentes no eligen su color: cada campo (`morado`, `grafito`, `blanco`) declara el relleno, texto y hover del botón, el texto secundario y el color de filete, y todo lo que vive dentro los hereda. Un botón nuevo en una sección nueva toma el color correcto sin variante.

## Typography

**Display Font:** Mona Sans variable (peso 200–900, ancho 75–125%), con `ui-sans-serif, system-ui` de respaldo
**Body Font:** Mona Sans variable, mismo archivo, ancho normal

**Character:** Una grotesca contemporánea usada en dos voces: los titulares en ancho expandido, peso alto y tracking negativo tienen el aplomo de un cartel; el texto en ancho normal y peso 420 se lee tranquilo y cercano.

### Hierarchy
- **Display** (720, clamp(3.3rem, 7.6vw, 7.4rem), interlínea 0.92, ancho 116%): solo el titular del héroe ("Tus pasos valen.") y el del cierre ("Cada paso cuenta.", que crece hasta 9vw). La última línea va en menta.
- **Headline** (680, clamp(2.35rem, 5vw, 4.9rem), interlínea 0.98, ancho 116%): el titular de cada sección, siempre partido en dos líneas que se revelan por separado.
- **Headline pequeño** (680, ~clamp(1.8rem, 3.4vw, 2.9rem), interlínea ~1.02): titulares dentro de tableros y paneles (Tarjeta Camina, pestañas de Comunidad); variantes cercanas para el nombre de cada comercio y para cada etapa (hasta 4rem en escritorio).
- **Title** (680, clamp(1.4rem, 2.2vw, 1.9rem)): títulos de columna en la Ruta y en la tarjeta de comercios.
- **Lead** (420, clamp(1.08rem, 1.3vw, 1.25rem), interlínea 1.55): la frase bajo cada titular, en el color secundario del campo, a 26–34em de medida.
- **Body** (420, 1.0625rem, interlínea 1.6): texto corrido; `text-wrap: pretty` en párrafos y `balance` en titulares.
- **Label** (650, 1rem): botones; los enlaces de la barra van en 520 a 0.94rem.
- **Note** (420, 0.875rem): notas de procedencia ("Comercios y premios cargados en octubre de 2026…"), en el color secundario del campo.
- **Numeral** (700, clamp(1.25rem, 2.1vw, 1.75rem), ancho 110%, cifras tabulares): pasos y Puntos del contador; los Puntos de cada premio y el contador de etapas también usan cifras tabulares.

### Named Rules
**The One Family Rule.** Mona Sans es la única familia. La jerarquía se construye con el eje de ancho (116% titulares, 120% marca, 125% palabra del pie, 100% texto) y con el peso, nunca con una segunda tipografía.

**The Two-Line Headline Rule.** Los titulares de sección se escriben en dos líneas cortas y deliberadas; cada línea vive en su propia máscara y sube desde abajo al entrar en pantalla.

## Layout

Contenedor de 1280px de ancho máximo con medianil fluido de clamp(20px, 4.5vw, 56px) a cada lado. Cada sección tiene un padding vertical de clamp(96px, 12vw, 184px) y la cabecera de sección (titular + lead) deja clamp(56px, 7vw, 104px) antes del contenido.

- **Cabecera partida:** desde 900px el titular y el lead se reparten en 1.4fr / 1fr alineados a la base.
- **Héroe:** a altura de pantalla completa (100svh); desde 1000px, texto 1fr y escena 1.08fr. La escena es el mapa (proporción 900:730) con el teléfono montado sobre su borde inferior izquierdo, el contador arriba a la derecha y la tarjeta de premio abajo. En celular el teléfono y la tarjeta se reacomodan bajo el mapa.
- **Cómo funciona:** desde 1000px dos columnas; el teléfono queda fijo (sticky) al centro de la pantalla mientras las cuatro etapas, cada una de ~78vh, pasan por la otra columna unidas por una línea de progreso vertical. En celular cada etapa lleva su propio teléfono.
- **La app:** carrete horizontal fijado al scroll desde 1024px; en celular se desliza con el dedo con snap; sin fijado (pantallas medianas o "reducir movimiento"), las pantallas se ordenan en una grilla de 3 columnas desde 900px y de 5 desde 1200px.
- **Listas como libro de registro:** comercios, preguntas, la tríada de Origen, los premios de la Ruta y los detalles de Comunidad se separan con filetes de 1px, no con tarjetas.
- **Ritmo de huecos:** 12px entre botones, 24px en cabeceras, 48/56/64/80px entre columnas según la sección, márgenes de bloque de clamp(64–140px).
- **Puntos de quiebre:** 420px (se oculta el botón de la barra), 560/600px (ajustes de listas y de la escena del héroe), 760px (grillas de tres), 900px (cabeceras partidas, se oculta la barra fija móvil), 1000px (grillas de dos columnas del héroe y secciones), 1024px (carrete fijo), 1200px (enlaces de la barra visibles, desaparece el botón de menú; grilla de 5 pantallas).

**The Hairline Ledger Rule.** Las colecciones de contenido se ordenan como un registro: filas separadas por filetes de 1px del color de línea del campo. Las tarjetas con relleno se reservan para uno o dos bloques de marca por sección.

## Elevation & Depth

El sistema es plano y la profundidad nace del tono y de la superposición: cada sección sube 28px sobre la anterior con las esquinas superiores redondeadas, y los tableros morados se apilan en morados más claros (`plum` → `plum-2` → `plum-3`). Las sombras existen solo bajo objetos que en la vida real flotan (teléfonos, la barra fija, el contador, el control de comparar) y siempre están teñidas de un negro morado (`rgba(5, 3, 15, …)`) y desplazadas hacia abajo con difusión negativa, nunca como halo.

### Shadow Vocabulary
- **Teléfono** (`box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1), 0 30px 60px -24px rgba(5,3,15,0.6)`): todo teléfono; sobre blanco cambia a `0 40px 70px -36px rgba(17,19,24,0.5)`.
- **Teléfono del héroe inclinado** (`inset 0 0 0 1px rgba(255,255,255,0.12), 18px 30px 50px -18px rgba(5,3,15,0.75)`): el único teléfono con perspectiva (rotateY/rotateX que sigue al puntero).
- **Barra fija móvil** (`0 14px 30px -12px rgba(5,3,15,0.55)`).
- **Contador** (`0 10px 24px -12px rgba(5,3,15,0.6)`).
- **Control de comparar** (`0 6px 16px -6px rgba(5,3,15,0.6)`).
- **Anillo de pin** (`0 0 0 3px plum-2, 0 0 0 4.5px lavanda 50%`): anillo sólido que separa los logos del mapa; el destino alcanzado cambia a anillo menta de 6px.

### Named Rules
**The Sheet Rule.** La transición entre secciones es una hoja que sube sobre la anterior (esquinas superiores de 28px, margen negativo igual), no una línea, una ola ni un degradado.

**The Physical Shadow Rule.** Solo los objetos físicos (teléfonos y piezas que flotan sobre la página) llevan sombra, y la sombra cae hacia abajo teñida de morado oscuro. Tarjetas y tableros son planos.

## Shapes

Tres formas y nada más: píldoras para todo lo que se toca (botones, pestañas, chips, barra fija, enlaces de la barra en hover), círculos para todo lo que marca un lugar o un logro (pines del mapa, paradas de la Ruta, sellos, nodos de etapa, botón de pregunta abierta), y rectángulos de esquina suave para los contenedores: 16px en tableros y tarjetas, 20px en el mapa del héroe, 12px en logos de comercio, portadas y el mapa de la Ruta. Los teléfonos escalan su radio con su ancho (15% del ancho por fuera, 12,5% la pantalla). Las secciones solo redondean sus esquinas superiores (28px).

**The Pill-or-Circle Rule.** Si se toca, es píldora; si marca un lugar o un logro, es círculo. Los contenedores no toman ninguna de las dos formas.

## Components

### Buttons
Píldoras firmes y planas, sin brillos.
- **Shape:** píldora completa (999px), 52px de alto, 28px de padding lateral, borde transparente de 1.5px.
- **Primary en campo oscuro (morado o grafito):** relleno menta, texto morado, peso 650.
- **Primary en campo claro:** relleno morado, texto menta.
- **Hover / Active / Focus:** el relleno pasa a `mint-2` o `plum-3` en 0.25s con la curva exponencial de salida; al presionar escala a 0.97; foco con anillo de 2px (menta en campos oscuros, morado en claros) separado 3px.
- **Ghost:** transparente con borde de 1.5px al 30% del blanco (o 25% del grafito sobre claro); en hover el borde pasa al color del texto.
- **Small:** 44px de alto y 20px de padding (barra superior y barra fija móvil).
- **Tiendas:** caja de 14px de radio con borde lavanda, "Próximamente en" en pequeño sobre el nombre; sin enlace y en lavanda mientras no hay tienda pública.

### Chips
- **Pastilla de Puntos:** píldora con la moneda real (22px) pegada al borde izquierdo (padding 3px 12px 3px 3px), el número en 700 a 1.05rem con cifras tabulares y "Puntos" en pequeño. Sobre campos oscuros, fondo `mint-soft` y número menta; sobre blanco, fondo `mint-light` y texto `mint-ink`. Es la forma de mostrar el costo de cada premio en la lista de comercios.
- **Chip de dato (Cómo funciona):** píldora `paper-2` con texto morado 600 y un punto menta de 8px con filete `mint-ink`. Resume la regla real de cada etapa. En la etapa "Sumas Puntos" el punto se reemplaza por la moneda y el chip pasa a `mint-light` con texto `mint-ink`.
- **"+1" del héroe:** copia el chip "+5" de la app: píldora verde profundo (`#3c7867`) con texto blanco 750 (5,2:1) y la moneda de 16px; aparece con un pequeño salto sobre la esquina de la celda de Puntos al pasar los 1.000 pasos.
- **"Listo para canjear":** píldora menta con texto morado que sustituye a "38 Puntos" cuando se desbloquea el premio.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** morado (Tarjeta Camina, tablero de la Ruta) o grafito alto (tarjeta de comercios).
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** ninguno; la tarjeta de premio del héroe lleva un borde lavanda de 1.5px que se vuelve menta al desbloquearse.
- **Internal Padding:** clamp(28px, 4vw, 56px) en la Tarjeta; clamp(18px, 3vw, 36px) en el tablero de la Ruta.

### Navigation
- **Barra superior fija:** 72px, se compacta a 60px al bajar y gana un fondo sólido que adopta el color de la sección que tiene debajo (morado, grafito o blanco, con su filete). Marca con el logo de 30px y "CAMINA" en 760 a 120% de ancho y tracking 0.06em. Enlaces en 520 con hover de píldora al 10% del color del texto. Desde 1200px se ven los enlaces y "Panel de comercios"; debajo, un botón de menú circular de 44px abre un menú morado a pantalla completa con enlaces grandes anchos (clamp(2rem, 8.4vw, 3.2rem)) que suben en cascada.
- **Barra fija móvil:** píldora morada flotante sobre el borde inferior (bajo 900px) con "Muy pronto en App Store y Google Play." y el botón "Avísame"; aparece al dejar el héroe y se esconde al llegar al cierre.

### Teléfono (signature)
Marco de 300px por defecto (escala por contexto), cuerpo `#0c0d11` con filete interior blanco al 10%, radio del 15% del ancho y pantalla con radio del 12,5%. Siempre contiene una captura real de la app (780×1688, modo oscuro) o un video real; nunca una interfaz dibujada. En pares se superponen con giros de -6° a +5° y el de atrás oscurecido (brillo 0.6–0.75).

### Escena del mapa (signature)
El mapa real del centro de Tarija tratado en morado (escala de grises, invertido, contraste 1.35, mezcla `screen` al 30% sobre `plum-2`), con el recorrido pendiente punteado en lavanda y el recorrido hecho en menta. Dieciocho huellas del logo aparecen a lo largo de la ruta, un punto menta con borde morado camina, los logos de comercios reales son pines circulares y el destino gana un anillo menta al llegar. Arriba a la derecha, el contador (Pasos / Puntos) en cifras tabulares, con la moneda de 26px junto al número de Puntos; abajo, la tarjeta del premio real con su barra de progreso y el costo como moneda + "38 Puntos" en menta.

El mismo tratamiento de mapa se repite en el tablero de la Ruta del mes. Allí el recorrido se traza en un marco girado 19° para seguir el rumbo de las calles del ráster: tramos rectos en zigzag a lo largo de las dos direcciones de la cuadrícula, punteado lavanda debajo y menta encima, dibujado por el scroll. Las paradas circulares se encienden en menta (y el final en blanco) cuando el trazo las alcanza; la etiqueta de cada parada va debajo, salvo cuando el tramo de llegada viene desde abajo, en cuyo caso sube por encima de la parada para no cruzarse con la línea.

### Etapas (Cómo funciona)
Lista ordenada con un riel vertical de 2px (`paper-3`) que se llena de morado con el scroll; cada etapa tiene un nodo circular de 16px que se vuelve menta con borde morado al activarse. En escritorio las etapas inactivas bajan a gris y un contador grande morado ("01 de 04") acompaña al teléfono fijo, cuya captura cambia con un fundido breve.

### Tarjeta Camina (sellos)
Tablero morado con cinco círculos: cuatro menta con una huella del logo en morado y el quinto en blanco con "Gratis". Con movimiento, los sellos empiezan vacíos (borde lavanda discontinuo) y se llenan uno tras otro cada 160ms.

### Pestañas (Comunidad)
Carril en píldora `ink-3` con padding de 5px; una pastilla menta se desliza bajo la pestaña activa (0.55s, curva exponencial). Texto en `mut-ink`, blanco en hover y morado sobre la pastilla. Navegables con flechas.

### Preguntas
Acordeón nativo con filas separadas por filete; la pregunta en 620 a clamp(1.1rem, 1.5vw, 1.3rem) y un botón circular de 32px con un "+" dibujado que gira a "−" y se rellena de morado con trazo menta al abrirse.

### Huellas e iconos
La huella del logo (izquierda y derecha) es la única grafía decorativa; se usa como máscara que toma `currentColor`, en sellos, en el inicio de la Ruta, en el mapa y en la hilera que cruza el cierre (opacidad 0.1–0.85, a 90°). Los iconos funcionales (check, bandera, ticket, insignia, intercambio) son trazos de 1.75 con extremos redondeados a 24px, en círculos morados de 64px con trazo menta cuando representan un premio.

## Do's and Don'ts

### Do:
- **Do** dejar que el campo decida el color: dentro de morado o grafito el botón principal es menta con texto morado; dentro de blanco es morado con texto menta.
- **Do** escribir cada titular de sección en dos líneas, en Mona Sans 680 a 116% de ancho y tracking -0.03em, y revelarlo línea a línea desde su máscara.
- **Do** usar `mint-ink` cuando el menta tenga que ser texto o filete sobre blanco cálido.
- **Do** mostrar el producto solo con capturas o videos reales dentro del marco de teléfono (780×1688, modo oscuro).
- **Do** ordenar colecciones con filetes de 1px del color de línea del campo, y reservar el relleno para uno o dos tableros de marca por sección.
- **Do** dar a cada sección nueva la entrada de hoja: esquinas superiores de 28px y margen superior de -28px sobre la anterior.
- **Do** usar la curva exponencial de salida (`cubic-bezier(0.16, 1, 0.3, 1)`) en revelados y cambios de estado, y dejar todo visible y quieto con "reducir movimiento".
- **Do** poner cifras tabulares en todo número que cambie o se compare (pasos, Puntos, contador de etapas, coordenadas).
- **Do** mostrar cada cantidad de Puntos con la moneda real de la app junto al número, en la pastilla de Puntos del campo.

### Don't:
- **Don't** usar degradados, vidrio (`backdrop-filter`), brillos ni halos; la portada no tiene ninguno.
- **Don't** usar el menta como texto sobre blanco cálido (1,3:1).
- **Don't** añadir una segunda familia tipográfica; el ancho y el peso de Mona Sans hacen toda la jerarquía.
- **Don't** convertir el morado en fondo de una sección intermedia; entre héroe y cierre las secciones alternan blanco cálido y grafito.
- **Don't** poner sombra a tarjetas o tableros; la sombra es solo de objetos físicos y cae hacia abajo teñida de morado oscuro.
- **Don't** usar otra grafía decorativa que las huellas del logo, ni iconos de librería: los iconos funcionales se dibujan con trazo 1.75 redondeado.
- **Don't** representar los Puntos con un icono dibujado, un punto de color o un símbolo; siempre la moneda de la app.
- **Don't** dibujar interfaces de la app ni mostrar mockups en modo claro, salvo el comparador claro/oscuro, que existe para mostrar ambos modos.
