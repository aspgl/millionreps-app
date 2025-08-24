/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          dark: {
            primary: '#0a0a0a',
            secondary: '#1a1a1a',
            card: '#1e1e1e',
            border: '#2a2a2a',
            text: '#ffffff',
            'text-secondary': '#a0a0a0',
            accent: '#8b5cf6',
            'accent-hover': '#7c3aed',
          }
        }
      },
    },
    plugins: [],
  }
  