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
                }
            },
            'dark',
            'cupcake',
        ],
        darkTheme: 'light',
    },
};
