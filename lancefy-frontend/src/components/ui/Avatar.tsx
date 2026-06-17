import { HTMLAttributes, useState } from 'react';
import { cn } from '@/utils/cn';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    fallback?: string;
}

export default function Avatar({ src, alt, size = 'md', fallback, className, ...props }: AvatarProps) {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const [imgError, setImgError] = useState(false);
    const initials = fallback || alt?.charAt(0).toUpperCase() || '?';

    return (
        <div
            className={cn(
                'relative inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-medium overflow-hidden',
                sizes[size],
                className
            )}
            {...props}
        >
            {src && !imgError ? (
                <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
}
