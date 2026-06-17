import { cn } from '@/utils/cn';

export interface ProgressBarProps {
    value: number;
    max?: number;
    className?: string;
    showLabel?: boolean;
}

export default function ProgressBar({ value, max = 100, className, showLabel }: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={cn('w-full', className)}>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                    className="bg-blue-600 h-full transition-all duration-300 ease-in-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <p className="text-xs text-gray-600 mt-1">{Math.round(percentage)}%</p>
            )}
        </div>
    );
}
