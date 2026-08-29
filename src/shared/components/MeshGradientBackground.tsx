import React from 'react';
import { cn } from '../../app/components/ui/utils';

export interface MeshGradientBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

/**
 * MeshGradientBackground component renders a container with a premium mesh gradient background.
 * It includes a border radius matching the rounded-3xl (1.5rem) styling on the talent-matching screen.
 * 
 * Usage:
 * ```tsx
 * import { MeshGradientBackground } from '@/shared/components/MeshGradientBackground';
 * 
 * <MeshGradientBackground className="p-6 min-h-screen">
 *   Your Content
 * </MeshGradientBackground>
 * ```
 */
export function MeshGradientBackground({
  children,
  className,
  as: Component = 'div',
  ...props
}: MeshGradientBackgroundProps) {
  return (
    <Component
      className={cn('mesh-gradient-bg', className)}
      {...props}
    >
      {children}
    </Component>
  );
}
