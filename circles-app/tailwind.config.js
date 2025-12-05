import daisyui from 'daisyui';

export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            fontFamily: {
                dmSans: ['DM Sans', 'sans-serif'],
            },
        },
    },
    plugins: [daisyui],
    daisyui: {
        themes: [
            {
                mytheme: {
                    primary: '#38318b',
                    secondary: '#4052d6',
                    accent: '#37cdbe',
                    neutral: '#3d4451',
                    'base-100': '#ffffff',
                },
                'circles-clean': {
                    primary: '#4F46E5', // indigo-600
                    secondary: '#7C3AED', // violet-600
                    accent: '#10B981', // emerald-500
                    neutral: '#1F2937', // gray-800
                    'base-100': '#FFFFFF',
                    'base-200': '#F8FAFC', // slate-50
                    'base-300': '#E5E7EB', // gray-200
                    info: '#38BDF8', // sky-400
                    success: '#16A34A', // green-600
                    warning: '#F59E0B', // amber-500
                    error: '#EF4444', // red-500
                    '--rounded-box': '12px',
                    '--rounded-btn': '10px',
                    '--tab-border': '1px'
                },
                'circles-dark': {
                    primary: '#6366F1', // indigo-500 (slightly brighter for dark bg)
                    secondary: '#8B5CF6', // violet-500
                    accent: '#34D399', // emerald-400
                    neutral: '#374151', // gray-700
                    'base-100': '#1F2937', // gray-800
                    'base-200': '#111827', // gray-900
                    'base-300': '#374151', // gray-700
                    'base-content': '#F9FAFB', // gray-50
                    info: '#38BDF8', // sky-400
                    success: '#22C55E', // green-500
                    warning: '#FBBF24', // amber-400
                    error: '#F87171', // red-400
                    '--rounded-box': '12px',
                    '--rounded-btn': '10px',
                    '--tab-border': '1px'
                }
            },
            'dark',
            'cupcake',
        ],
        darkTheme: 'circles-dark',
    },
};
