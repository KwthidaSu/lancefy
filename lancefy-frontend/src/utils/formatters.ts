
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return formatDate(date);
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function getWorkflowStatusText(status: string): string {
    const map: Record<string, string> = {
        todo: 'To Do',
        in_progress: 'In Progress',
        review: 'In Review',
        done: 'Done',
    };
    return map[status] || status;
}

export function getFundingStatusText(status: string): string {
    const map: Record<string, string> = {
        unfunded: 'Unfunded',
        funded: 'Reserved (Gateway)',
        released: 'Released',
        refunded: 'Refunded',
    };
    return map[status] || status;
}

export function getSubmissionStatusText(status: string): string {
    const map: Record<string, string> = {
        none: 'Not Submitted',
        submitted: 'Submitted',
        revision_requested: 'Revision Requested',
        resubmitted: 'Resubmitted',
        approved: 'Approved',
    };
    return map[status] || status;
}
