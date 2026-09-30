import { type ViewProps } from 'react-native';
import { Glass } from '@/components/ui/Glass';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return <Glass className={`rounded-md ${className ?? ''}`} {...props} />;
}
