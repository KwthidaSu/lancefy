import { ReactNode } from 'react';
import { formatRelativeTime } from '@/utils/formatters';

export interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    timestamp: string;
    icon?: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error';
}

export interface TimelineProps {
    items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
    const variantColors = {
        default: 'bg-blue-500',
        success: 'bg-lime-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
    };

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {items.map((item, idx) => (
                    <li key={item.id}>
                        <div className="relative pb-8">
                            {idx !== items.length - 1 && (
                                <span
                                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                                    aria-hidden="true"
                                />
                            )}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span
                                        className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${variantColors[item.variant || 'default']
                                            }`}
                                    >
                                        {item.icon || (
                                            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <circle cx="10" cy="10" r="3" />
                                            </svg>
                                        )}
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                        {item.description && (
                                            <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                                        )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                        {formatRelativeTime(item.timestamp)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
