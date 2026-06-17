/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Sarabun", "system-ui", "sans-serif"],
                logo: ["Lora", "serif"],
            },
            colors: {
                background: "rgb(var(--background) / <alpha-value>)",
                surface: "rgb(var(--surface) / <alpha-value>)",
                border: "rgb(var(--border) / <alpha-value>)",
                input: "rgb(var(--input) / <alpha-value>)",

                primary: "rgb(var(--primary) / <alpha-value>)",
                "primary-hover": "rgb(var(--primary-hover) / <alpha-value>)",
                "primary-foreground":
                    "rgb(var(--primary-foreground) / <alpha-value>)",

                accent: "rgb(var(--accent) / <alpha-value>)",
                "accent-foreground":
                    "rgb(var(--accent-foreground) / <alpha-value>)",

                success: "rgb(var(--success) / <alpha-value>)",
                danger: "rgb(var(--danger) / <alpha-value>)",

                text: {
                    primary: "rgb(var(--text-primary) / <alpha-value>)",
                    secondary: "rgb(var(--text-secondary) / <alpha-value>)",
                    muted: "rgb(var(--text-muted) / <alpha-value>)",
                    subtle: "rgb(var(--text-subtle) / <alpha-value>)",
                },
                status: {
                    pending: {
                        50: '#fffbeb',
                        100: '#fef3c7',
                        500: '#f59e0b',
                        600: '#d97706',
                        700: '#b45309',
                    },
                    'in-progress': {
                        50: '#eff6ff',
                        100: '#dbeafe',
                        500: '#3b82f6',
                        600: '#2563eb',
                        700: '#1d4ed8',
                    },
                    review: {
                        50: '#faf5ff',
                        100: '#f3e8ff',
                        500: '#a855f7',
                        600: '#9333ea',
                        700: '#7e22ce',
                    },
                    funded: {
                        50: '#eef2ff',
                        100: '#e0e7ff',
                        500: '#6366f1',
                        600: '#4f46e5',
                        700: '#4338ca',
                    },
                    released: {
                        50: '#f0fdf4',
                        100: '#dcfce7',
                        500: '#22c55e',
                        600: '#16a34a',
                        700: '#15803d',
                    },
                    refunded: {
                        50: '#f9fafb',
                        100: '#f3f4f6',
                        500: '#6b7280',
                        600: '#4b5563',
                        700: '#374151',
                    },
                    dispute: {
                        50: '#fef2f2',
                        100: '#fee2e2',
                        500: '#ef4444',
                        600: '#dc2626',
                        700: '#b91c1c',
                    },
                },
            },


            borderRadius: {
                lg: 'var(--radius)',
                xl: 'calc(var(--radius) + 4px)',
            },
            keyframes: {
                "card-flip": {
                    from: {
                        opacity: "0",
                        transform: "perspective(800px) rotateY(-15deg) scale(0.95)",
                    },
                    to: {
                        opacity: "1",
                        transform: "perspective(800px) rotateY(0deg) scale(1)",
                    },
                },
            },
            animation: {
                "card-flip": "card-flip 0.6s ease-out forwards",
            },
        },
    },
    plugins: [],
}
