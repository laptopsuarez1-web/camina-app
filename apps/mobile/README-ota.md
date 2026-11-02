# Actualizaciones OTA (sin build)

Desde el primer build que incluye `expo-updates`, los cambios que son solo JavaScript (pantallas, textos, lógica) se publican sin pasar por la tienda:

```
npm run ota --workspace apps/mobile -- "qué cambió"
```

Eso publica en el canal `production`. La app lo baja al abrirse y lo aplica la **siguiente** vez que se abre.

## Qué NO sale por OTA (necesita build)
Cualquier cambio nativo: instalar o quitar un paquete con código nativo, tocar plugins o permisos en `app.json`, cambiar el ícono o el splash. La política `fingerprint` hace que un OTA solo llegue a builds con el mismo código nativo; si el nativo cambió, ese OTA no se aplica a los builds viejos y hace falta un build nuevo.

## Importante
- La app instalada ANTES de este cambio (iOS 40 / AAB v19 y anteriores) no trae `expo-updates`: no recibe OTA. El primer build con este cambio es el que abre la puerta.
- Cada build gasta cupo del plan Free de EAS (30 al mes); un OTA no.
