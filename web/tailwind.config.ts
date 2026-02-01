import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cursor-inspired colors
        primary: {
          DEFAULT: '#00A67E',
          dark: '#008F6B',
          light: '#00C896',
        },
        secondary: {
          DEFAULT: '#1A1A1A',
          light: '#2D2D2D',
        },
        accent: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
        },
        surface: {
          light: '#FFFFFF',
          'light-secondary': '#F5F5F5',
          dark: '#171717',
          'dark-secondary': '#1F1F1F',
        },
        border: {
          light: '#E5E5E5',
          dark: '#262626',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
