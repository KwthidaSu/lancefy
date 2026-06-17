import { forwardRef, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

type DivMotionProps = Omit<HTMLMotionProps<'div'>, 'children'>;

export interface CardProps extends DivMotionProps {
  hover?: boolean;
  children?: ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        layout
        layoutId="auth-card"
        transition={{
          layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        }}
        className={cn(
          'bg-white rounded-3xl shadow-sm',
          hover && 'transition-shadow hover:shadow-md',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
export default Card;
