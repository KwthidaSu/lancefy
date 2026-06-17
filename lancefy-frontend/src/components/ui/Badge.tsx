import { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'pending' | 'in-progress' | 'review' | 'funded' | 'released' | 'refunded' | 'dispute' | 'warning';
}

export default function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
    const variants = {
        default: 'bg-gray-100 text-gray-700',
        pending: 'bg-status-pending-100 text-status-pending-700',
        'in-progress': 'bg-status-in-progress-100 text-status-in-progress-700',
        review: 'bg-status-review-100 text-status-review-700',
        funded: 'bg-status-funded-100 text-status-funded-700',
        released: 'bg-status-released-100 text-status-released-700',
        refunded: 'bg-status-refunded-100 text-status-refunded-700',
        dispute: 'bg-status-dispute-100 text-status-dispute-700',
        warning: 'bg-amber-100 text-amber-800',  // Added warning
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}
