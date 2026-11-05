import { Circle, Defs, Ellipse, G, Line, LinearGradient as SvgLinear, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// Dibujos de los fondos del perfil: paisajes de Bolivia y uno de Camina.
// Cada escena mide W x H y va anclada abajo; lo importante queda entre y=90 y y=300 (así también se lee en la miniatura).
export const W = 400;
export const H = 300;

// Números repetibles: los dibujos no cambian entre pantallas ni entre aperturas.
export function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

export function Stars({ n, seed, maxY = 150, tint = '#fff' }: { n: number; seed: number; maxY?: number; tint?: string }) {
  const r = rng(seed);
  return (
    <G>
      {Array.from({ length: n }, (_, i) => {
        const x = r() * W;
        const y = r() * maxY;
        const big = r() > 0.88;
        return <Circle key={i} cx={x} cy={y} r={big ? 1.7 : 0.7 + r() * 0.7} fill={tint} opacity={big ? 0.95 : 0.35 + r() * 0.5} />;
      })}
    </G>
  );
}

export function Glow({ id, cx, cy, r, color, opacity = 0.5 }: { id: string; cx: number; cy: number; r: number; color: string; opacity?: number }) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </>
  );
}

// Capa con degradé vertical: arriba más clara y abajo más oscura, da profundidad.
function Layer({ id, d, top, bottom, o = 1 }: { id: string; d: string; top: string; bottom: string; o?: number }) {
  return (
    <>
      <Defs>
        <SvgLinear id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={bottom} />
        </SvgLinear>
      </Defs>
      <Path d={d} fill={`url(#${id})`} opacity={o} />
    </>
  );
}

// Huellas de Camina: un pie y el otro, alternados. Cada punto es [x, y, ángulo, escala].
export function Footsteps({ pts, color = '#62F0B6', o = 0.9 }: { pts: [number, number, number, number?][]; color?: string; o?: number }) {
  return (
    <G opacity={o}>
      {pts.map(([x, y, a, s = 1], i) => (
        <G key={i} transform={`translate(${x} ${y}) rotate(${a}) translate(${i % 2 ? 4 * s : -4 * s} 0) scale(${s})`}>
          <Ellipse cx={0} cy={0} rx={3.2} ry={5.2} fill={color} />
          <Circle cx={-1.6} cy={-7.4} r={1.3} fill={color} />
          <Circle cx={0.6} cy={-8.2} r={1.2} fill={color} />
          <Circle cx={2.4} cy={-7.2} r={1} fill={color} />
        </G>
      ))}
    </G>
  );
}

// Huellas que suben hacia el horizonte, cada vez más chicas.
function trail(x0: number, y0: number, x1: number, y1: number, n: number, s0 = 1.3, s1 = 0.45): [number, number, number, number][] {
  const a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI + 90;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const e = 1 - Math.pow(1 - t, 1.6);
    return [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, a, s0 + (s1 - s0) * t];
  });
}

function Sparkle({ x, y, s = 1, o = 0.8, color = '#fff' }: { x: number; y: number; s?: number; o?: number; color?: string }) {
  return <Path d={`M${x} ${y - 6 * s} Q${x + 1 * s} ${y - 1 * s} ${x + 6 * s} ${y} Q${x + 1 * s} ${y + 1 * s} ${x} ${y + 6 * s} Q${x - 1 * s} ${y + 1 * s} ${x - 6 * s} ${y} Q${x - 1 * s} ${y - 1 * s} ${x} ${y - 6 * s}Z`} fill={color} opacity={o} />;
}

// ---------- Camina: el aro de la Ruta y un camino de huellas sobre el violeta de la marca ----------
export function Camina() {
  const r = 78;
  const c = 2 * Math.PI * r;
  const seg = c / 3;
  return (
    <G>
      <Glow id="ca-a" cx={318} cy={150} r={190} color="#8B4FD1" opacity={0.55} />
      <Glow id="ca-b" cx={70} cy={270} r={160} color="#62F0B6" opacity={0.18} />
      <G transform="rotate(-90 318 150)">
        <Circle cx={318} cy={150} r={r} stroke="#62F0B6" strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${seg - 16} 16`} opacity={0.3} />
        <Circle cx={318} cy={150} r={r - 20} stroke="#C4B8E8" strokeWidth={1.5} fill="none" strokeDasharray="2 7" opacity={0.35} />
      </G>
      <Footsteps
        pts={[[8, 300, 32, 1.5], [34, 282, 40, 1.45], [64, 268, 52, 1.4], [98, 258, 64, 1.35], [134, 254, 78, 1.3], [170, 256, 92, 1.25], [204, 262, 104, 1.2], [236, 270, 112, 1.15], [268, 276, 108, 1.1], [300, 276, 92, 1.05], [330, 270, 74, 1], [358, 258, 60, 0.95], [382, 244, 50, 0.9]]}
        o={0.42}
      />
      <Sparkle x={70} y={130} s={1.2} o={0.7} />
      <Sparkle x={200} y={110} s={0.8} o={0.5} color="#62F0B6" />
      <Sparkle x={250} y={200} s={0.7} o={0.45} />
      <Sparkle x={140} y={190} s={0.6} o={0.4} color="#C4B8E8" />
    </G>
  );
}

// ---------- Viñedos de Tarija: atardecer sobre las hileras de parras ----------
export function Vinedos() {
  const vp = { x: 200, y: 204 };
  const ks = Array.from({ length: 13 }, (_, k) => k - 6);
  const r = rng(11);
  // Cada hilera es una franja verde que se abre hacia abajo (perspectiva), con la copa ondulada.
  const row = (k: number) => {
    const bx = vp.x + k * 74;
    const half = 21;
    const n = 14;
    const top: string[] = [];
    for (let i = 0; i <= n; i++) {
      const t = Math.pow(i / n, 1.5);
      const x = vp.x + (bx - vp.x) * t;
      const y = vp.y + (300 - vp.y) * t;
      const h = 1 + t * half * (i % 2 ? 0.85 : 1);
      top.push(`${x} ${y - h}`);
    }
    const base: string[] = [];
    for (let i = n; i >= 0; i--) {
      const t = Math.pow(i / n, 1.5);
      base.push(`${vp.x + (bx - vp.x) * t + t * 6 * Math.sign(k || 1)} ${vp.y + (300 - vp.y) * t}`);
    }
    return `M${top.join(' L')} L${base.join(' L')} Z`;
  };
  const grapes: { x: number; y: number; s: number }[] = [];
  ks.forEach((k) => {
    for (let i = 7; i <= 13; i++) {
      const t = Math.pow(i / 14, 1.5);
      if (r() > 0.55) grapes.push({ x: vp.x + k * 74 * t + (r() - 0.5) * 8 * t, y: vp.y + 96 * t - 2 * t, s: 1 + t * 2.2 });
    }
  });
  return (
    <G>
      <Glow id="vn-sun" cx={200} cy={150} r={200} color="#ffb36b" opacity={0.65} />
      <Circle cx={200} cy={156} r={28} fill="#ffd690" />
      <Circle cx={200} cy={156} r={20} fill="#ffe9bb" />
      <Layer id="vn-far" d="M0 188 L35 172 L70 180 L110 160 L150 178 L185 170 L230 158 L270 174 L310 160 L350 176 L400 166 V215 H0Z" top="#a24f98" bottom="#62308a" o={0.95} />
      <Layer id="vn-mid" d="M0 204 Q70 188 140 198 Q210 208 270 194 Q340 184 400 198 V230 H0Z" top="#5c2e80" bottom="#33184f" />
      <Layer id="vn-gr" d="M0 204 H400 V300 H0Z" top="#6a4a3a" bottom="#2a1a1a" />
      <Defs>
        <SvgLinear id="vn-row" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3f7a3c" />
          <Stop offset="1" stopColor="#5fae4c" />
        </SvgLinear>
      </Defs>
      {ks.map((k) => <Path key={k} d={row(k)} fill="url(#vn-row)" />)}
      {grapes.map((g, i) => (
        <G key={i}>
          <Circle cx={g.x - g.s * 0.7} cy={g.y} r={g.s} fill="#8b4fd1" />
          <Circle cx={g.x + g.s * 0.7} cy={g.y} r={g.s} fill="#7a3fb8" />
          <Circle cx={g.x} cy={g.y + g.s * 1.1} r={g.s} fill="#6a2f9e" />
        </G>
      ))}
      <Footsteps pts={trail(237, 300, 203, 214, 9, 1.3, 0.35)} o={0.95} />
    </G>
  );
}

// ---------- Illimani de noche: el nevado sobre las luces de La Paz y el teleférico ----------
function quad(p0: number[], p1: number[], p2: number[], t: number) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

function Cable({ a, m, b, cabins, color }: { a: number[]; m: number[]; b: number[]; cabins: number[]; color: string }) {
  return (
    <G>
      <Path d={`M${a[0]} ${a[1]} Q${m[0]} ${m[1]} ${b[0]} ${b[1]}`} stroke="#d9d2f5" strokeWidth={0.9} fill="none" opacity={0.6} />
      {cabins.map((t, i) => {
        const [x, y] = quad(a, m, b, t);
        const s = 0.8 + t * 0.4;
        return (
          <G key={i}>
            <Line x1={x} y1={y} x2={x} y2={y + 4 * s} stroke="#d9d2f5" strokeWidth={0.8} opacity={0.7} />
            <Rect x={x - 4 * s} y={y + 4 * s} width={8 * s} height={6.5 * s} rx={1.8 * s} fill={color} />
            <Rect x={x - 2.8 * s} y={y + 5.4 * s} width={5.6 * s} height={2.4 * s} rx={0.6} fill="#ffe9b0" opacity={0.85} />
          </G>
        );
      })}
    </G>
  );
}

export function Illimani() {
  const r = rng(7);
  const lights = Array.from({ length: 150 }, () => {
    const x = r() * W;
    const top = 232 + Math.sin((x / W) * Math.PI * 2) * 8;
    const y = top + 6 + r() * (300 - top);
    const k = r();
    return { x, y, c: k > 0.9 ? '#62F0B6' : k > 0.45 ? '#ffd479' : '#ffb15c', rr: 0.6 + r() * 1.1, o: 0.45 + r() * 0.5 };
  });
  return (
    <G>
      <Glow id="il-moon" cx={330} cy={92} r={90} color="#c4b8e8" opacity={0.35} />
      <Circle cx={330} cy={92} r={15} fill="#fbf6ff" />
      <Circle cx={325} cy={89} r={3} fill="#e6dcf7" />
      <Circle cx={334} cy={97} r={2} fill="#e6dcf7" />
      <Layer id="il-m" d="M0 236 L40 214 L82 186 L112 166 L138 146 L160 132 L180 144 L204 116 L228 136 L252 124 L282 148 L318 168 L356 190 L400 208 V262 H0Z" top="#5a57a3" bottom="#211d4b" />
      <Path d="M108 168 L138 146 L160 132 L180 144 L204 116 L228 136 L252 124 L280 146 L268 148 L256 140 L246 152 L232 146 L220 158 L206 140 L194 156 L182 150 L168 160 L156 148 L142 160 L126 162 Z" fill="#f2f3ff" opacity={0.95} />
      <Path d="M204 116 L228 136 L252 124 L280 146 L268 148 L256 140 L246 152 L232 146 L220 158 L206 140 Z" fill="#c9cdf0" opacity={0.9} />
      <Layer id="il-c" d="M0 240 Q55 222 110 232 Q190 248 260 230 Q330 214 400 234 V300 H0Z" top="#251c4f" bottom="#0a071d" />
      {lights.map((l, i) => <Circle key={i} cx={l.x} cy={l.y} r={l.rr} fill={l.c} opacity={l.o} />)}
      <Cable a={[-10, 254]} m={[180, 262]} b={[410, 214]} cabins={[0.18, 0.46, 0.74]} color="#e5484d" />
      <Cable a={[-10, 286]} m={[210, 288]} b={[410, 250]} cabins={[0.3, 0.62, 0.9]} color="#f5c33b" />
      <Cable a={[-10, 228]} m={[120, 236]} b={[260, 214]} cabins={[0.4, 0.8]} color="#34c77b" />
    </G>
  );
}

// ---------- Salar de Uyuni: el cielo del atardecer reflejado en la sal ----------
export function Salar() {
  const hor = 200;
  const hills = 'M0 200 L40 193 L90 195 L128 180 L150 172 L172 186 L226 195 L292 194 L336 184 L356 186 L400 196 V200 H0Z';
  const rowsY = [216, 226, 239, 256, 278, 306];
  const hexes: string[] = [];
  rowsY.forEach((y, ri) => {
    const s = (y - hor) / 22;
    const rx = 10 * s;
    const ry = rx * 0.32;
    const step = rx * 1.5 * 2;
    const off = ri % 2 ? step / 2 : 0;
    for (let x = -step + off; x < W + step; x += step) {
      hexes.push(`M${x - rx} ${y} L${x - rx / 2} ${y - ry} L${x + rx / 2} ${y - ry} L${x + rx} ${y} L${x + rx / 2} ${y + ry} L${x - rx / 2} ${y + ry} Z`);
    }
  });
  return (
    <G>
      <Glow id="sa-sun" cx={255} cy={190} r={170} color="#ffc08a" opacity={0.6} />
      <Circle cx={255} cy={190} r={17} fill="#fff0cf" />
      <Path d={hills} fill="#5c3a82" />
      <Layer id="sa-ref" d={`M0 ${hor} H400 V300 H0Z`} top="#f2ab84" bottom="#4b2a80" />
      <G transform={`translate(0 ${hor * 2}) scale(1 -1)`} opacity={0.45}>
        <Path d={hills} fill="#5c3a82" />
      </G>
      <Ellipse cx={255} cy={211} rx={15} ry={6} fill="#fff0cf" opacity={0.7} />
      <Rect x={248} y={216} width={14} height={1.6} rx={0.8} fill="#fff0cf" opacity={0.45} />
      <Rect x={244} y={222} width={22} height={1.4} rx={0.7} fill="#fff0cf" opacity={0.3} />
      <Line x1={0} y1={hor} x2={400} y2={hor} stroke="#ffe2c4" strokeWidth={0.8} opacity={0.6} />
      <Path d={hexes.join(' ')} stroke="#ffffff" strokeWidth={1} fill="none" opacity={0.22} />
      <Footsteps pts={trail(120, 302, 238, 214, 10, 1.35, 0.35)} o={0.9} />
      <Sparkle x={60} y={120} s={0.7} o={0.6} />
      <Sparkle x={150} y={100} s={0.5} o={0.45} />
    </G>
  );
}

// ---------- Lago Titicaca: amanecer con la Cordillera Real, la Isla del Sol y una balsa de totora ----------
export function Titicaca() {
  const r = rng(5);
  const glints = Array.from({ length: 34 }, () => {
    const y = 206 + Math.pow(r(), 1.4) * 94;
    const w = 4 + ((y - 200) / 100) * 22 * r();
    return { x: r() * W, y, w, o: 0.15 + r() * 0.3 };
  });
  return (
    <G>
      <Glow id="ti-sun" cx={110} cy={178} r={170} color="#ffb98a" opacity={0.55} />
      <Circle cx={110} cy={180} r={19} fill="#ffe1b0" />
      <Layer id="ti-cr" d="M0 186 L28 172 L50 178 L80 152 L102 166 L130 158 L160 134 L186 160 L212 150 L240 126 L270 156 L300 146 L328 162 L360 140 L400 166 V200 H0Z" top="#8d84d0" bottom="#5c4f9e" o={0.95} />
      <Path d="M70 160 L80 152 L90 158 L84 160 Z M150 142 L160 134 L170 144 L162 142 Z M230 134 L240 126 L252 138 L242 136 Z M350 148 L360 140 L370 150 L360 148 Z" fill="#f4f2ff" opacity={0.95} />
      <Layer id="ti-lake" d="M0 196 H400 V300 H0Z" top="#5d6fd0" bottom="#0e1645" />
      <Rect x={98} y={198} width={24} height={2} rx={1} fill="#ffe1b0" opacity={0.7} />
      <Rect x={94} y={206} width={32} height={2} rx={1} fill="#ffe1b0" opacity={0.45} />
      <Rect x={100} y={216} width={20} height={2} rx={1} fill="#ffe1b0" opacity={0.3} />
      {glints.map((g, i) => <Rect key={i} x={g.x} y={g.y} width={g.w} height={1.4} rx={0.7} fill="#ffffff" opacity={g.o} />)}
      <Layer id="ti-isla" d="M200 202 Q236 180 272 186 Q300 172 336 182 Q370 186 400 198 V206 H200Z" top="#4a3a80" bottom="#2a2054" />
      <Path d="M236 190 Q262 186 286 190 M290 184 Q316 178 344 186 M250 196 Q290 190 330 194" stroke="#6b5aa8" strokeWidth={1} fill="none" opacity={0.6} />
      <G transform="translate(0 4)">
        <Path d="M96 254 Q132 268 178 266 Q214 264 236 246 Q244 236 240 224 Q236 238 222 246 Q184 254 140 254 Q112 254 104 244 Q98 236 102 226 Q92 238 96 254Z" fill="#d8a54a" />
        <Path d="M108 250 Q150 260 220 250 M112 256 Q160 264 214 256" stroke="#9c6e22" strokeWidth={1.4} fill="none" opacity={0.8} />
        <Path d="M240 224 Q248 214 244 206 Q238 212 240 224Z M102 226 Q96 218 100 210 Q106 218 102 226Z" fill="#c8913a" />
        <G transform="translate(0 532) scale(1 -1)" opacity={0.22}>
          <Path d="M96 254 Q132 268 178 266 Q214 264 236 246 Q244 236 240 224 Q236 238 222 246 Q184 254 140 254 Q112 254 104 244 Q98 236 102 226 Q92 238 96 254Z" fill="#d8a54a" />
        </G>
      </G>
    </G>
  );
}

// ---------- Valle de la Luna: las agujas de arcilla bajo la luna llena ----------
function spire(x: number, base: number, h: number, w: number) {
  return `M${x - w / 2} ${base} L${x - w * 0.34} ${base - h * 0.55} L${x - w * 0.22} ${base - h * 0.86} Q${x} ${base - h - 5} ${x + w * 0.2} ${base - h * 0.88} L${x + w * 0.32} ${base - h * 0.5} L${x + w / 2} ${base}Z`;
}

export function ValleLuna() {
  const r = rng(13);
  const far = Array.from({ length: 16 }, (_, i) => ({ x: i * 27 + r() * 14, h: 26 + r() * 34, w: 16 + r() * 10 }));
  const near = Array.from({ length: 9 }, (_, i) => ({ x: i * 50 - 10 + r() * 22, h: 70 + r() * 70, w: 26 + r() * 16 }));
  return (
    <G>
      <Glow id="vl-moon" cx={300} cy={100} r={120} color="#e9dcff" opacity={0.4} />
      <Circle cx={300} cy={100} r={26} fill="#f6efff" />
      <Circle cx={292} cy={94} r={5} fill="#e4d6f6" />
      <Circle cx={308} cy={108} r={3.5} fill="#e4d6f6" />
      <Circle cx={304} cy={90} r={2.2} fill="#e4d6f6" />
      <Layer id="vl-far" d={far.map((s) => spire(s.x, 236, s.h, s.w)).join(' ') + ' M0 230 H400 V240 H0Z'} top="#8a6ab0" bottom="#4c3474" />
      <Layer id="vl-gr" d="M0 236 H400 V300 H0Z" top="#3a2660" bottom="#140b26" />
      <Layer id="vl-near" d={near.map((s) => spire(s.x, 304, s.h, s.w)).join(' ')} top="#d8b9e4" bottom="#5a3a7a" />
      <Path d={near.map((s) => `M${s.x + s.w * 0.05} ${304 - s.h * 0.9} L${s.x + s.w * 0.32} ${304 - s.h * 0.5} L${s.x + s.w / 2} 304 L${s.x + s.w * 0.12} 304 Z`).join(' ')} fill="#2a1a48" opacity={0.45} />
      <Path d={near.map((s) => `M${s.x - s.w * 0.4} ${304 - s.h * 0.3} L${s.x + s.w * 0.4} ${304 - s.h * 0.32} M${s.x - s.w * 0.3} ${304 - s.h * 0.6} L${s.x + s.w * 0.28} ${304 - s.h * 0.62}`).join(' ')} stroke="#f1e0f5" strokeWidth={0.8} opacity={0.35} />
      <Sparkle x={90} y={110} s={0.8} o={0.7} />
      <Sparkle x={180} y={140} s={0.5} o={0.5} color="#62F0B6" />
    </G>
  );
}

// Clave guardada en profiles.profile_bg -> escena. Las claves viejas se conservan (no hace falta migración).
export const SCENES = { violeta: Camina, bosque: Vinedos, ciudad: Illimani, sendero: Salar, pista: Titicaca, cielo: ValleLuna } as const;
export const STARRY: Record<string, boolean> = { violeta: true, ciudad: true, cielo: true, pista: false, bosque: false, sendero: false };
