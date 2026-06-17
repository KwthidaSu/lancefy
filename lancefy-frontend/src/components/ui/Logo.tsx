import { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface LogoProps extends HTMLAttributes<HTMLHeadingElement> {
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({
  size = 'md',
  className,
  ...props
}: LogoProps) {
  return (
    <h1
      className={cn(
        'font-logo font-medium text-center',
        'bg-gradient-to-r from-primary via-primary/70 to-primary',
        'bg-clip-text text-transparent',

        'leading-tight',

        size === 'sm' && 'text-2xl tracking-[0.03em]',
        size === 'md' && 'text-4xl tracking-[0.04em]',
        size === 'lg' && 'text-5xl tracking-[0.05em]',

        className
      )}
      {...props}
    >
      Lancefy
    </h1>
  );
}
