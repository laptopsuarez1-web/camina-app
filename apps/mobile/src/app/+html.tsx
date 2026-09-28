import { ScrollViewStyleReset } from 'expo-router/html';

// Mismo font stack que usaba el prototipo original (-apple-system,
// BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif) —
// en nativo esto ya pasa solo (RN usa la fuente del sistema), pero en la
// versión web react-native-web no lo aplicaba y todo el texto salía con
// una tipografía genérica distinta a la del original.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
* {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
body {
  background-color: #fff;
}
`;
