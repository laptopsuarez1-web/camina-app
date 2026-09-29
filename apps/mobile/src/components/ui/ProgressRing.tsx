import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  radius?: number;
  progress: number; // 0..1
  trackColor?: string;
  progressColor?: string;
  // Aro fino interior (por ejemplo, avance hacia el próximo Punto), con brillo y punta luminosa.
  innerProgress?: number; // 0..1
  innerColor?: string;
  innerRadius?: number;
  innerStrokeWidth?: number;
  children?: React.ReactNode;
}

export function ProgressRing({
  size = 250,
  strokeWidth = 26,
  radius,
  progress,
  trackColor = 'rgba(255,255,255,0.1)',
  progressColor = '#7FEDC4',
  innerProgress,
  innerColor = '#2CFFAE',
  innerRadius = 80,
  innerStrokeWidth = 7,
  children,
}: ProgressRingProps) {
  const r = radius ?? (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = c - clamped * c;

  const hasInner = innerProgress != null;
  const ir = innerRadius;
  const ic = 2 * Math.PI * ir;
  const ip = Math.min(1, Math.max(0, innerProgress ?? 0));
  const angle = 2 * Math.PI * ip;
  const tipX = size / 2 + ir * Math.cos(angle);
  const tipY = size / 2 + ir * Math.sin(angle);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
        />
        {hasInner && (
          <>
            <Circle cx={size / 2} cy={size / 2} r={ir} stroke="rgba(255,255,255,0.12)" strokeWidth={innerStrokeWidth} fill="none" />
            {/* brillo: el mismo trazo, más ancho y muy transparente, por capas */}
            {ip > 0 && (
              <>
                {[innerStrokeWidth + 12, innerStrokeWidth + 7, innerStrokeWidth + 3].map((w, i) => (
                  <Circle
                    key={w}
                    cx={size / 2}
                    cy={size / 2}
                    r={ir}
                    stroke={innerColor}
                    strokeOpacity={[0.07, 0.11, 0.2][i]}
                    strokeWidth={w}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${ic} ${ic}`}
                    strokeDashoffset={ic - ip * ic}
                  />
                ))}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ir}
                  stroke={innerColor}
                  strokeWidth={innerStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${ic} ${ic}`}
                  strokeDashoffset={ic - ip * ic}
                />
                {/* punta luminosa */}
                <Circle cx={tipX} cy={tipY} r={innerStrokeWidth + 6} fill={innerColor} fillOpacity={0.18} />
                <Circle cx={tipX} cy={tipY} r={innerStrokeWidth + 2} fill={innerColor} fillOpacity={0.35} />
                <Circle cx={tipX} cy={tipY} r={innerStrokeWidth / 2 + 1.5} fill="#EFFFF9" />
              </>
            )}
          </>
        )}
      </Svg>
      {children}
    </View>
  );
}
