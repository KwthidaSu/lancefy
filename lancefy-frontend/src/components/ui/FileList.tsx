import type { FileAttachment } from '@/types';
import { formatFileSize } from '@/utils/formatters';

export interface FileListProps {
    files: FileAttachment[];
    onRemove?: (id: string) => void;
}

export default function FileList({ files, onRemove }: FileListProps) {
    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) {
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            );
        }
        return (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        );
    };

    if (files.length === 0) {
        return null;
    }

    return (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0 text-gray-400">
                            {getFileIcon(file.type)}
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                    </div>
                    {onRemove && (
                        <button
                            onClick={() => onRemove(file.id)}
                            className="ml-4 flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Remove file"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}
