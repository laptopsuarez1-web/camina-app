import { View, type ViewProps } from 'react-native';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-card-light dark:bg-card-dark border border-line-light dark:border-line-dark rounded-md ${className ?? ''}`}
      {...props}
    />
  );
}
