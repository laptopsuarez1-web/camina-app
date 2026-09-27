import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  trackColor?: string;
  progressColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  size = 250,
  strokeWidth = 26,
  progress,
  trackColor = 'rgba(255,255,255,0.1)',
  progressColor = '#7FEDC4',
  children,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = c - clamped * c;

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
      </Svg>
      {children}
    </View>
  );
}
