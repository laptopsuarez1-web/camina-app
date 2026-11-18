# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary (portada caminaapp.com):** personas de Tarija (y luego otras ciudades de Bolivia) que caminan en su día a día —al trabajo, a la tienda, a la plaza— y quieren que eso tenga premio. Llegan desde redes, QR de carteles o recomendaciones, casi siempre en el celular. Su trabajo en la página: entender en segundos qué es Camina y pedir que les avisen / descargarla.
- **Secundario:** dueños de comercios locales que quieren clientes nuevos. En la portada solo se les deriva a `/comercios` (página propia, fuera de este alcance).

## Product Purpose

Camina es una app (iPhone y Android) que cuenta los pasos, los convierte en Puntos y permite canjearlos por premios y descuentos en comercios de la ciudad. Éxito de la portada: que la persona entienda el mecanismo caminar → Puntos → premio y deje su intención (avisarme / descargar).

## Positioning

Una app boliviana, hecha en Tarija, que conecta a quien camina con los comercios de su propia ciudad: los premios son reales y locales, y caminar es todo lo que hay que hacer.

## Capabilities and Constraints

- Reglas reales (no cambiar): 1.000 pasos = 1 Punto; máximo 20 Puntos por día; Puntos vencen a los 90 días; canje en el local escribiendo el código del local; mismo local cada 14 días; tarjeta de 5 canjes = premio gratis (30 días para canjear); racha con 5.000 pasos/día; ranking semanal (se reinicia los lunes); grupos con meta semanal, ranking y chat; insignias Visitante/Habitual/Fan; Ruta del mes (3 locales sorpresa, se compra sin usar Puntos; premio: Día doble, insignia del mes, boleto al sorteo).
- Pasos vía Apple Salud o Health Connect; solo suman los días en que se abre la app.
- **Lanzamiento:** fecha no confirmada. Las tiendas aún no tienen la app pública: los botones de App Store y Google Play se muestran como "Próximamente" y sin enlace hasta que haya links públicos.
- CTA principal de la portada: "Avísame cuando salga" (correo) hasta que haya tiendas; luego "Descargar". CTA secundario: comercios → `/comercios`.
- Fuera de alcance: `/comercios`, panel de comercios, Partners, login/registro, backend, base de datos.

## Brand Commitments

- Nombre: Camina / CAMINA. Logo: dos huellas (la derecha con un corazón) dentro de un aro (`public/marca/`).
- Colores oficiales del logo: menta `#62F0B6` y morado profundo `#200A52` (confirmados por el usuario).
- Bases de la web pedidas por el usuario: blanco cálido `#F7F7F5` y negro grafito `#111318`, alternando secciones claras y oscuras.
- Voz: español neutro, sin voseo ("tienes", "camina"); corto, cercano, tarijeño; "Puntos" con mayúscula; "zona", no "barrio". Origen boliviano presente pero elegante, sin banderas ni símbolos decorativos.
- Mockups de la app siempre en modo oscuro.

## Evidence on Hand

- Capturas reales de la app: `public/web/cap/*-dark.jpg` (780×1688). Videos reales de la Ruta: `public/web/vid/`.
- Comercios y premios reales (octubre 2026): Bloom, Coco Barber, Fripap's, Cancheritos F.C — `src/components/landing/locales.ts`.
- Contacto: WhatsApp +591 627 14286, hola@caminaapp.com, Instagram @caminaapp.
- **No existen**: cifras de usuarios, testimonios, alianzas ni prensa. No inventarlos.

## Product Principles

1. Mostrar el producto real: capturas y datos verdaderos, nunca interfaces inventadas.
2. El mecanismo primero: caminar → Puntos → premio debe entenderse en el primer pantallazo.
3. Lo local es el valor: comercios reales de la ciudad, no promesas genéricas.
4. Nada se promete antes de existir: tiendas, fechas y premios solo cuando están confirmados.

## Accessibility & Inclusion

Público general, mayormente en celulares de gama media: contraste AA, texto legible, objetivos táctiles grandes, respeto de "reducir movimiento" y carga rápida en redes móviles.
