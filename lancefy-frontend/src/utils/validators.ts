
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isRequired(value: string | number | null | undefined): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

export function minLength(value: string, min: number): boolean {
    return value.trim().length >= min;
}

export function isPositiveNumber(value: number): boolean {
    return value > 0;
}

export function isFutureDate(date: string | Date): boolean {
    return new Date(date) > new Date();
}

export interface ValidationRule {
    validate: (value: unknown) => boolean;
    message: string;
}

export function validateField(value: unknown, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
        if (!rule.validate(value)) {
            return rule.message;
        }
    }
    return null;
}
