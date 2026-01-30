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
        // Brand colors
        primary: {
          DEFAULT: '#CFFC92',
          dark: '#B8E67D',
        },
        secondary: {
          DEFAULT: '#00353B',
          light: '#004D54',
        },
        // GitHub-style colors
        surface: {
          light: '#FFFFFF',
          'light-secondary': '#F6F8FA',
          dark: '#0D1117',
          'dark-secondary': '#161B22',
        },
        border: {
          light: '#D0D7DE',
          dark: '#30363D',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
