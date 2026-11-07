import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

// Dibujo de la portada del grupo (va encima del degradé del tema): un camino punteado que cruza la portada, unas
// huellas de Camina que lo recorren y dos brillos suaves de luz. No usa fotos, así siempre se ve bien y el texto se lee.
// Todo en blanco con poca opacidad: toma el color del tema que eligió el grupo.
const HUELLAS = require('@/../assets/ruta-huellas.png');
// Huellas de Camina sobre el camino (posición en % de la portada, giro y tamaño).
const STEPS: [number, number, number, number][] = [[14, 36, 62, 22], [34, 30, 70, 20], [76, 15, 52, 22]];

export function GroupBannerArt() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 393 300" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="glowA" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowB" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#7FEDC4" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#7FEDC4" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={340} cy={30} r={140} fill="url(#glowA)" />
        <Circle cx={30} cy={230} r={150} fill="url(#glowB)" />
        {/* Lomas suaves al fondo */}
        <Path d="M0 210 C 70 180, 130 196, 196 186 S 320 160, 393 176 L 393 300 L 0 300 Z" fill="#fff" fillOpacity={0.05} />
        <Path d="M0 236 C 90 214, 160 232, 240 222 S 350 206, 393 214 L 393 300 L 0 300 Z" fill="#fff" fillOpacity={0.05} />
        {/* El camino */}
        <Path d="M-10 150 C 60 128, 110 112, 170 104 S 270 84, 300 64 S 360 36, 410 30" stroke="#fff" strokeOpacity={0.22} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" fill="none" />
        <Ellipse cx={196} cy={300} rx={260} ry={46} fill="#000" fillOpacity={0.12} />
      </Svg>
      {STEPS.map(([x, y, r, size], i) => (
        <Image key={i} source={HUELLAS} resizeMode="contain" style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size * 1.1, opacity: 0.16, tintColor: '#fff', transform: [{ rotate: `${r}deg` }] }} />
      ))}
    </View>
  );
}
